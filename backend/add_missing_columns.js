// add_missing_columns.js  — safe to re-run; reads .env automatically
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// --- load .env manually ---
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let [, key, val] = m;
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const conn = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}` +
  `@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

(async () => {
  console.log('Connecting to:', conn.replace(/:[^:@]+@/, ':***@'));
  const c = new Client({ connectionString: conn });
  await c.connect();

  const statements = [
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS section       TEXT`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS section_order INTEGER DEFAULT 0`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon          TEXT`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS bg_color      TEXT DEFAULT '#F4F4F5'`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,

    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS icon          TEXT`,
    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS bg_color      TEXT DEFAULT '#F4F4F5'`,
    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'`,
    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS original_price NUMERIC`,
    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS image_url     TEXT`,
    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS store_id      INTEGER DEFAULT 1`,
  ];

  for (const sql of statements) {
    const col = sql.split(' ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0];
    try {
      await c.query(sql);
      console.log('[OK]', col);
    } catch (e) {
      console.log('[SKIP]', col, '->', e.message);
    }
  }

  const cats = await c.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'categories' ORDER BY ordinal_position`);
  console.log('\ncategories columns:',
    cats.rows.map(r => r.column_name).join(', '));

  const prods = await c.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'products' ORDER BY ordinal_position`);
  console.log('\nproducts columns:',
    prods.rows.map(r => r.column_name).join(', '));

  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });