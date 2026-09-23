// backend/scripts/delete_fv_and_cd.js
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

const STORE_ID = 1;
const SECTIONS = ['Fruits & Vegetables', 'Cold Drinks & Juices'];

(async () => {
  const client = await pool.connect();
  try {
    console.log('\n=== Before ===');
    const { rows: before } = await client.query(
      `SELECT c.section, COUNT(*)::int AS n
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.store_id = $1 AND c.section = ANY($2::varchar[])
        GROUP BY c.section ORDER BY c.section`,
      [STORE_ID, SECTIONS]
    );
    let total = 0;
    for (const r of before) {
      console.log(`  ${r.section.padEnd(25)} ${r.n}`);
      total += r.n;
    }
    console.log(`  TOTAL TO DELETE: ${total}`);

    await client.query('BEGIN');
    const del = await client.query(
      `DELETE FROM products
        WHERE store_id = $1
          AND category_id IN (
            SELECT id FROM categories WHERE section = ANY($2::varchar[])
          )`,
      [STORE_ID, SECTIONS]
    );
    await client.query('COMMIT');
    console.log(`\nDeleted: ${del.rowCount}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
