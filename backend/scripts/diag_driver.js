require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    console.log('=== Driver 1 state ===');
    const { rows: [d] } = await pool.query(`
      SELECT id, is_online, is_available, current_latitude, current_longitude,
             approval_status, active_orders_count
        FROM delivery_partners WHERE id=1`);
    console.log(' ', d);

    console.log('\n=== Recent driver_assignments (last 8) ===');
    const { rows: da } = await pool.query(`
      SELECT id, order_id, delivery_partner_id, status, offered_at, expires_at, responded_at
        FROM delivery_assignments ORDER BY id DESC LIMIT 8`);
    for (const r of da) console.log(' ', r);

    console.log('\n=== Recent orders ===');
    const { rows: o } = await pool.query(`
      SELECT id, store_id, driver_id, dispatch_status FROM orders ORDER BY id DESC LIMIT 6`);
    for (const r of o) console.log(' ', r);
  } finally { await pool.end(); }
})();
