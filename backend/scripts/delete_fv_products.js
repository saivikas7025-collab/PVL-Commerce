// backend/scripts/delete_fv_products.js
// Deletes ALL products in the Fruits & Vegetables section (store_id = 1).
// Default = dry-run. Add --apply to actually delete.
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

const APPLY = process.argv.includes('--apply');
const SECTION = 'Fruits & Vegetables';
const STORE_ID = 1;

(async () => {
  const client = await pool.connect();
  try {
    // 1. Preview: how many rows per category
    const { rows: breakdown } = await client.query(
      `SELECT c.name AS category, COUNT(*)::int AS cnt
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.store_id = $1 AND c.section = $2
        GROUP BY c.name
        ORDER BY c.name`,
      [STORE_ID, SECTION]
    );

    const total = breakdown.reduce((s, r) => s + r.cnt, 0);
    console.log(`\n=== Products to delete: ${total} ===`);
    console.log(`Section: ${SECTION}  |  store_id: ${STORE_ID}\n`);

    console.log('Breakdown by category:');
    for (const r of breakdown) {
      console.log(`  ${r.category.padEnd(30)} ${String(r.cnt).padStart(4)}`);
    }

    // 2. Sample names
    const { rows: sample } = await client.query(
      `SELECT p.id, p.name, c.name AS category
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.store_id = $1 AND c.section = $2
        ORDER BY p.id
        LIMIT 15`,
      [STORE_ID, SECTION]
    );
    console.log('\nFirst 15 rows:');
    for (const r of sample) {
      console.log(`  #${r.id}  [${r.category}]  ${r.name}`);
    }

    if (!APPLY) {
      console.log('\n--dry-run only. Run with --apply to delete.');
      return;
    }

    // 3. Delete
    await client.query('BEGIN');
    const del = await client.query(
      `DELETE FROM products
        WHERE store_id = $1
          AND category_id IN (
            SELECT id FROM categories WHERE section = $2
          )`,
      [STORE_ID, SECTION]
    );
    await client.query('COMMIT');
    console.log(`\nDeleted: ${del.rowCount}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('FAILED:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();