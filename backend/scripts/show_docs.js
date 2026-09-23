require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id, doc_type, doc_number, front_url, status
         FROM driver_documents WHERE driver_id=1 ORDER BY id`);
    console.log('driver_documents rows:');
    for (const r of rows) {
      const isDrive = !/^[0-9a-f]{16}\./.test(r.front_url || '');
      console.log(' ', r.doc_type, '→', r.front_url, '(' + (isDrive ? 'DRIVE' : 'local-storage') + ')');
    }
    await pool.end();
  } catch (e) { console.error(e.message); }
})();
