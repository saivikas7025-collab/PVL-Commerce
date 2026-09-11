/**
 * Razorpay webhook handler (mounted with express.raw in server.js).
 *
 * Signature: HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
 * Header  : X-Razorpay-Signature
 *
 * Idempotency: we insert with a WHERE NOT EXISTS clause against the
 * partial unique index on `event_id`. `ON CONFLICT (event_id)` cannot
 * infer a partial index, so we guard the insert manually.
 */
const { pool } = require('../db');
const { verifyWebhookSignature } = require('../services/razorpayService');

async function handleWebhook(req, res) {
  const signature = req.get('X-Razorpay-Signature');
  const rawBody = req.body; // Buffer, thanks to express.raw
  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).send('Invalid signature');
  }
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }
  const eventId =
    req.get('X-Razorpay-Event-Id') || event?.id || null;
  const type = String(event?.event || '');
  if (!eventId) {
    // Without an event id we can't dedupe, so refuse to process.
    return res.sendStatus(200);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Global dedupe first: if we've already stored this event id in either
    // table, ACK and stop. Uses the partial unique indexes.
    const dupPayment = await client.query(
      `SELECT 1 FROM payments WHERE event_id = $1 LIMIT 1`,
      [eventId]
    );
    const dupRefund = await client.query(
      `SELECT 1 FROM refunds WHERE event_id = $1 LIMIT 1`,
      [eventId]
    );
    if (dupPayment.rows.length || dupRefund.rows.length) {
      await client.query('COMMIT');
      return res.sendStatus(200);
    }

    if (type === 'payment.captured' || type === 'payment.failed') {
      const p = event?.payload?.payment?.entity;
      if (!p?.id || !p?.order_id) throw new Error('Malformed payment event');
      const status = type === 'payment.captured' ? 'captured' : 'failed';

      // Insert only if the internal order exists AND we haven't stored this
      // razorpay_payment_id yet.
      await client.query(
        `INSERT INTO payments
           (order_id, payment_method, razorpay_order_id, razorpay_payment_id,
            transaction_id, amount, status, event_id, event_type,
            gateway_response, failure_code, failure_description, raw_event)
         SELECT o.id, 'RAZORPAY', $1, $2, $2, o.total_amount,
                $3, $4, $5, $6, $7, $8, $9
         FROM orders o
         WHERE o.razorpay_order_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM payments p2
             WHERE p2.razorpay_payment_id = $2 AND p2.event_type <> 'razorpay.order.created'
           )`,
        [
          p.order_id, p.id, status,
          eventId, type,
          JSON.stringify(event),
          p.error_code || null,
          p.error_description || p.error_reason || null,
          JSON.stringify(event),
        ]
      );

      if (status === 'captured') {
        const upd = await client.query(
          `UPDATE orders
           SET payment_status = 'paid',
               status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END,
               updated_at = CURRENT_TIMESTAMP
           WHERE razorpay_order_id = $1 AND payment_status <> 'paid'
           RETURNING id, store_id`,
          [p.order_id]
        );
        if (upd.rows.length > 0) {
          await client.query(
            `INSERT INTO order_status_history (order_id, status, note)
             VALUES ($1, 'accepted', 'Payment captured (webhook)')`,
            [upd.rows[0].id]
          );
          const io = req.app.get('io');
          if (io) {
            io.to(`order_${upd.rows[0].id}`).emit('order:status', {
              id: upd.rows[0].id, status: 'accepted', payment_status: 'paid',
            });
            io.to(`store_${upd.rows[0].store_id}`).emit('order:new', {
              orderId: upd.rows[0].id,
            });
          }
        }
      }
    } else if (type.startsWith('refund.')) {
      const r = event?.payload?.refund?.entity;
      if (!r?.id || !r?.payment_id) throw new Error('Malformed refund event');
      const status =
        type === 'refund.processed' ? 'processed'
        : type === 'refund.failed' ? 'failed'
        : 'created';
      await client.query(
        `INSERT INTO refunds
           (order_id, payment_id, razorpay_refund_id, razorpay_payment_id,
            event_id, event_type, amount, status, reason, raw_event)
         SELECT
           pmt.order_id, pmt.id, $1, $2, $3, $4, $5, $6, $7, $8
         FROM payments pmt
         WHERE pmt.razorpay_payment_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM refunds r2 WHERE r2.razorpay_refund_id = $1
           )
         ORDER BY pmt.id DESC LIMIT 1`,
        [
          r.id, r.payment_id, eventId, type,
          Number(r.amount || 0) / 100, status,
          r.notes?.reason || r.speed_processed || null,
          JSON.stringify(event),
        ]
      );
    }

    await client.query('COMMIT');
    return res.sendStatus(200);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Razorpay webhook error:', err);
    return res.sendStatus(500);
  } finally {
    client.release();
  }
}

module.exports = { handleWebhook };
