require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, created_at FROM users WHERE LOWER(email)='saivikas7025@gmail.com'`);
    console.log('users row for saivikas7025@gmail.com:');
    for (const r of rows) console.log(' ', r);

    const { rows: dp } = await pool.query(
      `SELECT id, user_id, approval_status FROM delivery_partners
        WHERE user_id IN (SELECT id FROM users WHERE LOWER(email)='saivikas7025@gmail.com')`);
    console.log('\ndelivery_partners rows for that user:');
    for (const r of dp) console.log(' ', r);
    if (dp.length === 0) console.log('  (none — this is why register tried to INSERT)');
  } finally { await pool.end(); }
})();
