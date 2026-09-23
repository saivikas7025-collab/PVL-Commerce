// backend/scripts/clean_garbage_rows.js
// Deletes ONLY the three known junk rows (1406, 1407, 1408).
// Nothing else is touched.
require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 5432),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace('/', ''),
  ssl: { rejectUnauthorized: false },
});

const GARBAGE_IDS = [1406, 1407, 1408];

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Show what will be deleted
    const preview = await client.query(
      `SELECT id, name FROM products WHERE id = ANY($1::int[]) ORDER BY id`,
      [GARBAGE_IDS]
    );
    console.log('\nRows to delete:');
    console.table(preview.rows);

    const del = await client.query(
      `DELETE FROM products WHERE id = ANY($1::int[])`,
      [GARBAGE_IDS]
    );
    console.log(`\nDeleted: ${del.rowCount}`);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('CLEANUP FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();