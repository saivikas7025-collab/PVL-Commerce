/**
 * Payment routes.
 *
 * - POST /api/payment/razorpay/order         → server-side Razorpay order
 * - POST /api/payment/razorpay/verify        → verify checkout signature
 * - GET  /api/payment/order/:orderId         → latest payment record
 * - PUT  /api/payment/order/:orderId/method  → convert to COD on failure
 * - POST /api/payment/submit                 → legacy UPI reference (kept)
 *
 * NOTE: the webhook endpoint is mounted separately in server.js so it can
 * use `express.raw()` — HMAC verification needs the exact bytes Razorpay
 * sent, and the global `express.json()` would parse them away.
 */
const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const {
  isConfigured,
  getClient,
  verifyCheckoutSignature,
  KEY_ID,
} = require('../services/razorpayService');

const router = express.Router();

// --------------------------------------------------------
// POST /api/payment/razorpay/order
// Body: { orderId }
// --------------------------------------------------------
router.post('/razorpay/order', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Online payments are not configured on the server yet.',
      });
    }

    const orderId = Number(req.body.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT id, user_id, total_amount, payment_method, payment_status,
              status, razorpay_order_id
       FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderResult.rows[0];
    if (order.user_id !== req.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    if (order.payment_method === 'COD') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This order is Cash on Delivery — no online payment needed.',
      });
    }
    if (order.payment_status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Order is already paid' });
    }
    if (order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Order is cancelled' });
    }

    // Idempotency: reuse an existing Razorpay order if we already created one.
    let razorpayOrderId = order.razorpay_order_id;
    const amountPaise = Math.round(Number(order.total_amount) * 100);

    if (!razorpayOrderId) {
      const rz = getClient();
      const rzOrder = await rz.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `PVL-${orderId}`.slice(0, 40),
        notes: { internal_order_id: String(orderId) },
      });
      razorpayOrderId = rzOrder.id;
      await client.query(
        `UPDATE orders SET razorpay_order_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [razorpayOrderId, orderId]
      );
      await client.query(
        `INSERT INTO payments
           (order_id, payment_method, razorpay_order_id, amount, status, event_type)
         VALUES ($1, 'RAZORPAY', $2, $3, 'pending', 'razorpay.order.created')`,
        [orderId, razorpayOrderId, Number(order.total_amount)]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      key_id: KEY_ID,
      order_id: razorpayOrderId,
      amount: amountPaise,
      currency: 'INR',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not start payment. Please try again.',
    });
  } finally {
    client.release();
  }
});

// --------------------------------------------------------
// POST /api/payment/razorpay/verify
// Body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// --------------------------------------------------------
router.post('/razorpay/verify', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const orderId = Number(req.body.orderId);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!Number.isInteger(orderId) || orderId <= 0 ||
        !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, verified: false, message: 'Missing payment fields' });
    }

    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT id, user_id, razorpay_order_id, total_amount, payment_status
       FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, verified: false });
    }
    const order = orderResult.rows[0];
    if (order.user_id !== req.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, verified: false });
    }
    // Use the DB's razorpay_order_id, not the value the client sent.
    if (!order.razorpay_order_id || order.razorpay_order_id !== razorpay_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false, verified: false, message: 'Order mismatch',
      });
    }

    const valid = verifyCheckoutSignature({
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    if (!valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false, verified: false, message: 'Signature verification failed',
      });
    }

    // Idempotent capture: if we already recorded this payment_id as captured,
    // return success without inserting again. We handle both cases:
    //   (a) the row is already present (checked below)
    //   (b) a concurrent webhook inserts it between our SELECT and INSERT —
    //       the unique index raises `23505` and we recover by re-checking
    const existing = await client.query(
      `SELECT id, status FROM payments
       WHERE razorpay_payment_id = $1 LIMIT 1`,
      [razorpay_payment_id]
    );
    if (existing.rows.length === 0) {
      try {
        await client.query(
          `INSERT INTO payments
             (order_id, payment_method, razorpay_order_id, razorpay_payment_id,
              transaction_id, amount, status, event_type, gateway_response)
           VALUES ($1, 'RAZORPAY', $2, $3, $3, $4, 'authorized', 'checkout.verified', $5)`,
          [
            orderId,
            order.razorpay_order_id,
            razorpay_payment_id,
            Number(order.total_amount),
            JSON.stringify({ signature: razorpay_signature }),
          ]
        );
      } catch (err) {
        // 23505 = unique_violation. The webhook beat us to it. That's fine —
        // the order will still be marked paid below.
        if (err.code !== '23505') throw err;
      }
    }

    // Mark the order as paid immediately after signature verification so the
    // customer sees confirmation. The webhook will re-affirm this on capture.
    await client.query(
      `UPDATE orders
       SET payment_status = 'paid', status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [orderId]
    );
    await client.query(
      `INSERT INTO order_status_history (order_id, status, note)
       VALUES ($1, 'accepted', 'Payment authorized')`,
      [orderId]
    );

    // Cart wasn't cleared at order creation time for online payments —
    // clear it now that the payment is verified.
    await client.query(
      `DELETE FROM cart_items ci
       USING carts c
       WHERE ci.cart_id = c.id AND c.user_id = $1`,
      [req.userId]
    );

    await client.query('COMMIT');

    // Push realtime updates
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('order:status', {
        id: orderId, status: 'accepted', payment_status: 'paid',
      });
      const orderStore = await pool.query(
        'SELECT store_id FROM orders WHERE id = $1', [orderId]
      );
      if (orderStore.rows[0]?.store_id) {
        io.to(`store_${orderStore.rows[0].store_id}`).emit('order:new', {
          orderId,
        });
      }
    }

    res.json({ success: true, verified: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    // Concurrency safety net: if the webhook already recorded this payment
    // and marked the order paid, treat verify as success.
    try {
      const already = await pool.query(
        `SELECT o.payment_status FROM orders o
         WHERE o.id = $1 AND o.user_id = $2`,
        [Number(req.body.orderId) || 0, req.userId]
      );
      if (already.rows[0]?.payment_status === 'paid') {
        return res.json({ success: true, verified: true });
      }
    } catch (_) {}
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({ success: false, verified: false });
  } finally {
    client.release();
  }
});

// --------------------------------------------------------
// GET /api/payment/order/:orderId
// --------------------------------------------------------
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    const order = await pool.query(
      `SELECT id, user_id FROM orders WHERE id = $1`,
      [orderId]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.rows[0].user_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const result = await pool.query(
      `SELECT id, order_id, payment_method, transaction_id, amount, status,
              razorpay_order_id, razorpay_payment_id, event_type, created_at
       FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
      [orderId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No payment record yet' });
    }
    res.json({ success: true, payment: result.rows[0] });
  } catch (error) {
    console.error('Payment lookup error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payment' });
  }
});

// --------------------------------------------------------
// PUT /api/payment/order/:orderId/method   → switch to COD after failure
// Body: { paymentMethod: 'COD' }
// --------------------------------------------------------
router.put('/order/:orderId/method', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const orderId = Number(req.params.orderId);
    const method = String(req.body.paymentMethod || '').toUpperCase();
    if (!Number.isInteger(orderId) || method !== 'COD') {
      return res.status(400).json({ success: false, message: 'Only COD conversion is supported here' });
    }
    if (String(process.env.COD_ENABLED || 'true').toLowerCase() !== 'true') {
      return res.status(400).json({ success: false, message: 'Cash on Delivery is disabled' });
    }

    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT id, user_id, payment_status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (orderResult.rows[0].user_id !== req.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    if (orderResult.rows[0].payment_status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Order is already paid' });
    }
    await client.query(
      `UPDATE orders
       SET payment_method = 'COD', payment_status = 'pending',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [orderId]
    );
    await client.query(
      `INSERT INTO order_status_history (order_id, status, note)
       VALUES ($1, 'pending', 'Converted to Cash on Delivery')`,
      [orderId]
    );
    // Now that this order is committed to COD, clear the user's cart.
    await client.query(
      `DELETE FROM cart_items ci
       USING carts c
       WHERE ci.cart_id = c.id AND c.user_id = $1`,
      [req.userId]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order is now Cash on Delivery' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Convert to COD error:', error);
    res.status(500).json({ success: false, message: 'Could not update payment method' });
  } finally {
    client.release();
  }
});

// --------------------------------------------------------
// POST /api/payment/submit  (legacy UPI reference upload, kept for backwards compat)
// --------------------------------------------------------
router.post('/submit', authenticate, async (req, res) => {
  try {
    const orderId = Number(req.body.orderId);
    const transactionId = String(req.body.transactionId || '').trim();
    if (!Number.isInteger(orderId) || !transactionId || transactionId.length > 200) {
      return res.status(400).json({ success: false, message: 'Invalid payment data' });
    }
    const order = await pool.query(
      `SELECT id, user_id, total_amount FROM orders WHERE id = $1`,
      [orderId]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.rows[0].user_id !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const duplicate = await pool.query(
      `SELECT id FROM payments WHERE transaction_id = $1 LIMIT 1`,
      [transactionId]
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This transaction reference has already been submitted',
      });
    }
    const payment = await pool.query(
      `INSERT INTO payments (order_id, payment_method, transaction_id, amount, status, event_type)
       VALUES ($1, 'UPI', $2, $3, 'pending', 'upi.submitted')
       RETURNING id, order_id, payment_method, transaction_id, amount, status, created_at`,
      [orderId, transactionId, order.rows[0].total_amount]
    );
    res.status(201).json({
      success: true,
      message: 'Payment reference submitted for verification',
      payment: payment.rows[0],
    });
  } catch (error) {
    console.error('Payment submit error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit payment' });
  }
});


// ---------------------------------------------------------------------------
// POST /upi/confirm
// Customer claims they paid via UPI to 9063257025@ybl.
// Marks order payment_status = 'awaiting_verification' so store/admin can
// confirm the payment manually before dispatch.
// ---------------------------------------------------------------------------
router.post('/upi/confirm', authenticate, async (req, res) => {
  try {
    const { orderId, upiReference } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const userId = req.user.id;
    const check = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await pool.query(
      `UPDATE orders
          SET payment_status = 'awaiting_verification',
              payment_reference = $2
        WHERE id = $1`,
      [orderId, upiReference || 'pending-manual-verification']
    );

    return res.json({ ok: true, orderId, payment_status: 'awaiting_verification' });
  } catch (e) {
    console.error('UPI confirm failed:', e);
    return res.status(500).json({ error: 'Could not record payment confirmation' });
  }
});
module.exports = router;
