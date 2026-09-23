require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    console.log('=== Recent store_assignments (offers) ===');
    const { rows: sa } = await pool.query(`
      SELECT id, order_id, store_id, status, score, offered_at, expires_at, responded_at
        FROM store_assignments ORDER BY id DESC LIMIT 5`);
    for (const r of sa) console.log(' ', r);

    console.log('\n=== Recent orders ===');
    const { rows: o } = await pool.query(`
      SELECT id, store_id, dispatch_status, accepted_by_store_at
        FROM orders ORDER BY id DESC LIMIT 5`);
    for (const r of o) console.log(' ', r);
  } finally { await pool.end(); }
})();
