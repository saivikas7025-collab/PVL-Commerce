// backend/scripts/restore_products.js
// Re-inserts products from a JSON backup. Idempotent (skips ids already present).
// Usage: node scripts/restore_products.js <path-to-backup.json>
require('dotenv').config();
const fs = require('fs');
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

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Usage: node scripts/restore_products.js <backup.json>');
  process.exit(1);
}

(async () => {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Backup contains ${rows.length} rows`);
  const client = await pool.connect();
  let inserted = 0, skipped = 0;
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      const exists = await client.query(
        `SELECT 1 FROM products WHERE id = $1`, [r.id]
      );
      if (exists.rowCount) { skipped++; continue; }
      await client.query(
        `INSERT INTO products
          (id, category_id, name, description, unit, price, original_price,
           image_url, is_active, subcategory_id, store_id, approval_status,
           store_notes, icon, bg_color)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [r.id, r.category_id, r.name, r.description, r.unit, r.price,
         r.original_price, r.image_url, r.is_active, r.subcategory_id,
         r.store_id, r.approval_status, r.store_notes, r.icon, r.bg_color]
      );
      inserted++;
    }
    await client.query(
      `SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))`
    );
    await client.query('COMMIT');
    console.log(`Inserted: ${inserted}  Already present: ${skipped}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();