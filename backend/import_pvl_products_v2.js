// backend/import_pvl_products_v2.js
// Reads .\sources\vegetables_fruits.txt and .\sources\cold_drinks.txt
// Format: "## CategoryName" followed by one product per line.
// Inserts into products table, matching the existing schema.
// Safe to re-run: duplicate check on (store_id, category_id, LOWER(name)).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

const SOURCES = [
  {
    file: path.join(__dirname, 'sources', 'vegetables_fruits.txt'),
    section: 'Fruits & Vegetables',
  },
  {
    file: path.join(__dirname, 'sources', 'cold_drinks.txt'),
    section: 'Cold Drinks & Juices',
  },
];

const DRY_RUN = process.argv.includes('--dry-run');
const STORE_ID = 1;
const PLACEHOLDER_PRICE = 99;
const PLACEHOLDER_UNIT = '1 unit';

function parseFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  const rows = [];
  let currentCategory = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('## ')) {
      currentCategory = line.replace(/^##\s+/, '').trim();
      continue;
    }
    if (line.startsWith('#')) continue;

    if (!currentCategory) continue;
    rows.push({ category: currentCategory, name: line });
  }
  return rows;
}

(async () => {
  const client = await pool.connect();
  try {
    // 1. Load category map: "section|||name" -> id
    const cats = await client.query(
      `SELECT id, name, section FROM categories WHERE section IS NOT NULL`
    );
    const catMap = new Map();
    for (const c of cats.rows) {
      catMap.set(`${c.section}|||${c.name}`.toLowerCase(), c.id);
    }

    // 2. Parse every source
    const allRows = [];
    for (const s of SOURCES) {
      if (!fs.existsSync(s.file)) {
        console.warn(`MISSING SOURCE (skip): ${s.file}`);
        continue;
      }
      const parsed = parseFile(s.file);
      console.log(`${path.basename(s.file)}: ${parsed.length} products across categories`);
      for (const p of parsed) {
        allRows.push({ section: s.section, category: p.category, name: p.name });
      }
    }

    // Dedupe within run
    const seen = new Set();
    const unique = [];
    for (const r of allRows) {
      const k = `${r.section}|||${r.category}|||${r.name}`.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(r);
    }

    console.log(`\nTotal parsed rows:  ${allRows.length}`);
    console.log(`Unique rows:        ${unique.length}`);

    // 3. Preview category mapping (find missing categories)
    const missingCats = new Set();
    const catUsage = new Map();

    for (const r of unique) {
      const key = `${r.section}|||${r.category}`.toLowerCase();
      const id = catMap.get(key);
      if (!id) {
        missingCats.add(`${r.section} > ${r.category}`);
        continue;
      }
      catUsage.set(key, (catUsage.get(key) || 0) + 1);
    }

    console.log('\nCategory mapping preview:');
    for (const [key, cnt] of [...catUsage.entries()].sort()) {
      const [section, cat] = key.split('|||');
      console.log(`  ${section} > ${cat}: ${cnt} rows`);
    }
    if (missingCats.size) {
      console.log('\nMISSING CATEGORIES (rows will be skipped):');
      for (const m of missingCats) console.log(`  ${m}`);
    }

    if (DRY_RUN) {
      console.log('\n--dry-run: no inserts performed.');
      return;
    }

    // 4. Insert
    await client.query('BEGIN');

    let inserted = 0;
    let existed = 0;
    let missing = 0;

    for (const r of unique) {
      const key = `${r.section}|||${r.category}`.toLowerCase();
      const categoryId = catMap.get(key);
      if (!categoryId) {
        missing++;
        continue;
      }

      const res = await client.query(
        `INSERT INTO products
           (category_id, name, description, unit, price, original_price,
            image_url, is_active, subcategory_id, store_id, approval_status,
            store_notes, icon, bg_color)
         SELECT $1::integer, $2::varchar, $3::text, $4::varchar,
                $5::numeric, $6::numeric, NULL::text, TRUE::boolean,
                NULL::integer, $7::integer, 'approved'::varchar,
                $8::text, $9::varchar, $10::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM products
           WHERE store_id = $7::integer
             AND category_id = $1::integer
             AND LOWER(name) = LOWER($2::varchar)
         )
         RETURNING id`,
        [
          categoryId,
          r.name,
          r.name,
          PLACEHOLDER_UNIT,
          PLACEHOLDER_PRICE,
          PLACEHOLDER_PRICE,
          STORE_ID,
          `Imported by import_pvl_products_v2 | ${r.section} > ${r.category}`,
          '🛒',
          '#F5F5F5',
        ]
      );

      if (res.rowCount) inserted++;
      else existed++;
    }

    await client.query('COMMIT');

    console.log('\n=== PVL PRODUCT IMPORT V2 COMPLETE ===');
    console.log(`Total parsed rows:      ${allRows.length}`);
    console.log(`Unique rows:            ${unique.length}`);
    console.log(`Inserted:               ${inserted}`);
    console.log(`Already existed:        ${existed}`);
    console.log(`Missing category maps:  ${missing}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('IMPORT FAILED:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();