require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  const { rows } = await pool.query(`SELECT id, doc_type, doc_number, front_url, status, uploaded_at FROM driver_documents WHERE driver_id=1 ORDER BY id DESC LIMIT 5`);
  console.log('driver_documents rows:');
  for (const r of rows) console.log(' ', r);
  await pool.end();
})();
