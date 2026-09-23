require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    const { rows: dp } = await pool.query(`
      SELECT dp.id, dp.user_id, dp.vehicle_type, dp.vehicle_number, dp.approval_status, dp.verification_status
        FROM delivery_partners dp
        JOIN users u ON u.id = dp.user_id
       WHERE LOWER(u.email) = 'saivikas7025@gmail.com'`);
    console.log('delivery_partners rows for saivikas7025@gmail.com:');
    if (dp.length === 0) console.log('  (none yet — register has not succeeded)');
    for (const r of dp) console.log(' ', r);

    if (dp.length) {
      const { rows: v } = await pool.query(
        `SELECT driver_id, overall_status FROM driver_verifications WHERE driver_id=$1`, [dp[0].id]);
      console.log('\ndriver_verifications row:');
      for (const r of v) console.log(' ', r);
    }
  } finally { await pool.end(); }
})();
