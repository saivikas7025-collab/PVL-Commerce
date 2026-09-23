require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role FROM users WHERE phone='9063257025'`);
    console.log('Users with phone 9063257025:');
    for (const r of rows) console.log(' ', r);
    await pool.end();
  } catch (e) { console.error(e.message); }
})();
