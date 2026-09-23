require('dotenv').config({ quiet: true });
const { pool } = require('../db');

(async () => {
  try {
    console.log('=== Dropping NOT NULL on orders.store_id ===');
    await pool.query(`ALTER TABLE orders ALTER COLUMN store_id DROP NOT NULL`);
    console.log('  done');

    console.log('\n=== Also check orders.driver_id ===');
    const { rows } = await pool.query(`
      SELECT column_name, is_nullable
        FROM information_schema.columns
       WHERE table_name='orders' AND column_name IN ('store_id','driver_id')
    `);
    for (const r of rows) console.log('  ', r);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
