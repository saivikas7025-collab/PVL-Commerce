require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    const { rowCount } = await pool.query(`
      INSERT INTO driver_verifications (driver_id)
      SELECT dp.id FROM delivery_partners dp
       WHERE NOT EXISTS (SELECT 1 FROM driver_verifications v WHERE v.driver_id = dp.id)
    `);
    console.log('Created', rowCount, 'missing driver_verifications row(s).');

    const { rows } = await pool.query(
      `SELECT driver_id, overall_status FROM driver_verifications ORDER BY driver_id`);
    console.log('Current rows:');
    for (const r of rows) console.log(' ', r);
  } finally { await pool.end(); }
})();
