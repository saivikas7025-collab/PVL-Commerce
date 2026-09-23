require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    console.log('=== driver_documents for driver 1 ===');
    const { rows: docs } = await pool.query(
      `SELECT id, doc_type, front_url, status FROM driver_documents WHERE driver_id=1 ORDER BY id`);
    if (docs.length === 0) console.log('  (none)');
    for (const r of docs) console.log(' ', r);

    console.log('\n=== driver_verifications for driver 1 ===');
    const { rows: [v] } = await pool.query(
      `SELECT * FROM driver_verifications WHERE driver_id=1`);
    console.log(' ', v);

    console.log('\n=== delivery_partners driver 1 ===');
    const { rows: [d] } = await pool.query(
      `SELECT id, verification_status, approval_status, risk_state FROM delivery_partners WHERE id=1`);
    console.log(' ', d);

    await pool.end();
  } catch (e) { console.error('ERR:', e.message); }
})();
