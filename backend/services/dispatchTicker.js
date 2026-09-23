/**
 * Dispatch timeout ticker — runs every 15s.
 *   - Expires stale store_assignments (status='offered', past expires_at)
 *     → marks them 'expired', releases inventory, re-dispatches to next candidate.
 *   - Expires stale delivery_assignments (status='offered', past expires_at)
 *     → marks them 'expired', re-dispatches to next driver.
 */
const { pool } = require('../db');
const engine = require('./dispatchEngine');

async function tickStoreTimeouts() {
  const { rows } = await pool.query(`
    SELECT id, order_id, store_id FROM store_assignments
     WHERE status = 'offered' AND expires_at IS NOT NULL AND expires_at < now()
     LIMIT 20
  `);
  for (const r of rows) {
    try {
      await pool.query(
        `UPDATE store_assignments SET status='expired', responded_at=now() WHERE id=$1`,
        [r.id]
      );
      await engine.releaseInventory(r.order_id);
      await pool.query(
        `UPDATE orders SET dispatch_status='store_timeout', updated_at=now() WHERE id=$1`,
        [r.order_id]
      );
      console.log('[ticker] store', r.store_id, 'timed out on order', r.order_id, '→ re-dispatch');
      await engine.dispatchOrder(r.order_id);
    } catch (e) {
      console.error('[ticker] store timeout error for order', r.order_id, ':', e.message);
    }
  }
}

async function tickDriverTimeouts() {
  const { rows } = await pool.query(`
    SELECT id, order_id, delivery_partner_id FROM delivery_assignments
     WHERE status = 'offered' AND expires_at IS NOT NULL AND expires_at < now()
     LIMIT 20
  `);
  for (const r of rows) {
    try {
      await pool.query(
        `UPDATE delivery_assignments SET status='expired', responded_at=now() WHERE id=$1`,
        [r.id]
      );
      await pool.query(
        `UPDATE orders SET dispatch_status='driver_timeout', updated_at=now() WHERE id=$1`,
        [r.order_id]
      );
      console.log('[ticker] driver', r.delivery_partner_id, 'timed out on order', r.order_id, '→ re-dispatch');
      await engine.dispatchToDriver(r.order_id);
    } catch (e) {
      console.error('[ticker] driver timeout error for order', r.order_id, ':', e.message);
    }
  }
}

function startDispatchTicker(intervalMs = 15000) {
  const id = setInterval(async () => {
    try {
      await tickStoreTimeouts();
      await tickDriverTimeouts();
    } catch (e) {
      console.error('[ticker] loop error:', e.message);
    }
  }, intervalMs);
  console.log('[dispatch] timeout ticker started (every ' + (intervalMs/1000) + 's)');
  return id;
}

module.exports = { startDispatchTicker, tickStoreTimeouts, tickDriverTimeouts };
