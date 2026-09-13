const express = require('express');
const { query } = require('../db'); // adjust if your helper is named differently
const { requireAuth } = require('../middleware/auth'); // adjust if named differently

const router = express.Router();

// POST /api/payment/upi/confirm
// Marks the order's payment as awaiting manual verification.
router.post('/upi/confirm', requireAuth, async (req, res) => {
  try {
    const { orderId, upiReference } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const userId = req.user.id;
    const check = await query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await query(
      `UPDATE orders
         SET payment_status = 'awaiting_verification',
             payment_reference = $2,
             payment_note = 'UPI to 9063257025@ybl — awaiting manual confirmation'
       WHERE id = $1`,
      [orderId, upiReference || 'pending-manual-verification']
    );

    await query(
      `INSERT INTO order_status_history (order_id, status, note, created_at)
       VALUES ($1, 'pending', 'Customer submitted UPI payment — awaiting verification', NOW())`,
      [orderId]
    ).catch(() => {}); // table may not exist in all envs

    return res.json({ ok: true, orderId, payment_status: 'awaiting_verification' });
  } catch (e) {
    console.error('UPI confirm failed:', e);
    return res.status(500).json({ error: 'Could not record payment confirmation' });
  }
});

module.exports = router;
