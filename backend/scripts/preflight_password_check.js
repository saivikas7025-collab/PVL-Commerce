require('dotenv').config();
const { pool } = require('../db');

(async () => {
  try {
    const { rows } = await pool.query(`
      SELECT id, phone,
        CASE
          WHEN password_hash IS NULL THEN 'null'
          WHEN password_hash = '' THEN 'empty'
          WHEN password_hash ~ '^\\$2[aby]\\$[0-9]{2}\\$' THEN 'bcrypt'
          ELSE 'plaintext-or-other'
        END AS hash_format,
        LENGTH(password_hash) AS hash_length
      FROM users
      WHERE role = 'delivery_partner'
      ORDER BY id
    `);

    console.log('\n=== Delivery partner password formats (no values shown) ===');

    for (const r of rows) {
      console.log(
        `  id=${r.id} phone=${r.phone} format=${r.hash_format} length=${r.hash_length}`
      );
    }

    console.log(`\nTotal delivery partners: ${rows.length}`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
