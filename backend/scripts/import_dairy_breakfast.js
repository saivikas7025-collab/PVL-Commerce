// backend/scripts/import_dairy_breakfast.js
// Parses sources/dairy_breakfast_raw.md and inserts products under the
// "Dairy & Breakfast" section, matching subcategory names to existing
// categories. Dry-run by default; --apply to insert.
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: dbUrl.hostname, port: Number(dbUrl.port || 5432),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace('/', ''),
  ssl: { rejectUnauthorized: false },
});

const APPLY = process.argv.includes('--apply');
const STORE_ID = 1;
const SECTION = 'Dairy & Breakfast';
const SOURCE = path.join(__dirname, '..', 'sources', 'dairy_breakfast_raw.md');

const SUBCATS = [
  'Milk','Bread & Pav','Eggs','Flakes & Kids Cereals','Muesli & Granola',
  'Oats','Paneer & Tofu','Curd & Yogurt','Butter & More','Cheese',
  'Cream & Whitener','Condensed Milk','Vermicelli','Poha, Daliya & Other Grains',
  'Peanut Butter','Energy Bars','Lassi, Shakes & More','Breakfast Mixes',
  'Honey & Chyawanprash','Sausage, Salami & Ham','Batter'
];
const SUBCATS_SORTED = [...SUBCATS].sort((a,b) => b.length - a.length);

function detectSubcat(line) {
  if (!line.startsWith('#') && !/^Extracted\b/i.test(line)) return null;
  if (/from the file/i.test(line)) return 'Butter & More';
  const lower = line.toLowerCase();
  for (const s of SUBCATS_SORTED) {
    if (lower.includes(s.toLowerCase())) return s;
  }
  return null;
}

const isTableRow = (line) => /^\s*\|/.test(line);
const isSeparator = (line) => /^\s*\|[\s\-:|]+\|\s*$/.test(line);
const splitCells = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(s => s.trim());

function findProductCol(h) {
  for (let i = 0; i < h.length; i++) if (/^(product|product name)$/i.test(h[i])) return i;
  for (let i = 0; i < h.length; i++) if (/^variant$/i.test(h[i])) return i;
  return -1;
}
function findSizeCol(h, prodIdx) {
  for (let i = 0; i < h.length; i++) {
    if (i === prodIdx) continue;
    if (/^(pack\/size|unit|size|pack|variant)$/i.test(h[i])) return i;
  }
  return -1;
}
function splitNameAndSize(s) {
  if (!s) return { name: '', size: '' };
  const m = s.match(/^(.+?)\s*[—–\-]\s*(\d+\s*x\s*\d+(?:\.\d+)?\s*\w+|\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pcs?|pc))\s*$/i);
  if (m) return { name: m[1].trim(), size: m[2].trim() };
  return { name: s.trim(), size: '' };
}
const clean = (s) => (s || '').replace(/₹\s*[\d,\.]+/g, '').replace(/\s+/g, ' ').trim();

function parseFile() {
  const raw = fs.readFileSync(SOURCE, 'utf8');
  const lines = raw.split(/\r?\n/);
  let currentSubcat = null, headers = null, productCol = -1, sizeCol = -1;
  const rows = [], skipped = [];
  for (const line of lines) {
    const t = line.trim(); if (!t) continue;
    const det = detectSubcat(t);
    if (det) { currentSubcat = det; headers = null; productCol = -1; sizeCol = -1; continue; }
    if (t.startsWith('#')) { headers = null; productCol = -1; sizeCol = -1; continue; }
    if (!isTableRow(t)) continue;
    if (isSeparator(t)) continue;
    const cells = splitCells(t);
    if (!/^\d+$/.test(cells[0])) { headers = cells; productCol = findProductCol(cells); sizeCol = findSizeCol(cells, productCol); continue; }
    if (productCol < 0 || cells.length <= productCol) continue;
    let name = clean(cells[productCol]);
    let size = sizeCol >= 0 && cells.length > sizeCol ? clean(cells[sizeCol]) : '';
    if (!size && /[—–]/.test(name)) { const s = splitNameAndSize(name); if (s.size) { name = s.name; size = s.size; } }
    if (!name) continue;
    if (!currentSubcat) { skipped.push(name); continue; }
    rows.push({ subcategory: currentSubcat, name, unit: size || '1 unit' });
  }
  return { rows, skipped };
}

(async () => {
  const { rows, skipped } = parseFile();
  console.log(`Parsed rows:      ${rows.length}`);
  if (skipped.length) console.log(`Skipped (no sub): ${skipped.length}`);

  const seen = new Set(), unique = [];
  for (const r of rows) {
    const k = `${r.subcategory}|||${r.name.toLowerCase()}|||${r.unit.toLowerCase()}`;
    if (seen.has(k)) continue; seen.add(k); unique.push(r);
  }
  console.log(`Unique rows:      ${unique.length}`);

  const bySub = new Map();
  for (const r of unique) { if (!bySub.has(r.subcategory)) bySub.set(r.subcategory, 0); bySub.set(r.subcategory, bySub.get(r.subcategory) + 1); }
  console.log('\nBy subcategory:');
  for (const [s, n] of [...bySub.entries()].sort()) console.log(`  ${s.padEnd(30)} ${n}`);

  const client = await pool.connect();
  try {
    const { rows: cats } = await client.query(`SELECT id, name FROM categories WHERE section = $1`, [SECTION]);
    const catMap = new Map(cats.map(c => [c.name.toLowerCase().trim(), c.id]));
    console.log(`\nDB categories in "${SECTION}": ${cats.length}`);
    console.log('  ' + cats.map(c => c.name).join(' | '));

    const missing = new Set(), insertable = [];
    for (const r of unique) {
      const id = catMap.get(r.subcategory.toLowerCase().trim());
      if (!id) { missing.add(r.subcategory); continue; }
      insertable.push({ ...r, categoryId: id });
    }
    console.log(`\nInsertable:       ${insertable.length}`);
    if (missing.size) console.log(`Missing cats:     ${[...missing].join(', ')}`);

    if (!APPLY) {
      console.log('\n--dry-run only. Run with --apply to insert.');
      console.log('\nSample (first 25):');
      for (const r of insertable.slice(0, 25)) console.log(`  [${r.subcategory}] ${r.name}  (${r.unit})`);
      return;
    }

    await client.query('BEGIN');
    let inserted = 0, existed = 0;
    for (const r of insertable) {
      const dup = await client.query(`SELECT 1 FROM products WHERE store_id=$1 AND category_id=$2 AND LOWER(name)=LOWER($3) LIMIT 1`, [STORE_ID, r.categoryId, r.name]);
      if (dup.rowCount) { existed++; continue; }
      await client.query(
        `INSERT INTO products (category_id,name,description,unit,price,original_price,image_url,is_active,subcategory_id,store_id,approval_status,store_notes,icon,bg_color)
         VALUES ($1,$2,$3,$4,$5,$5,NULL,TRUE,NULL,$6,'approved',$7,$8,$9)`,
        [r.categoryId, r.name, r.name, r.unit, 99, STORE_ID, `Imported from dairy_breakfast_raw | ${SECTION} > ${r.subcategory}`, '🛒', '#F5F5F5']
      );
      inserted++;
    }
    await client.query('COMMIT');
    console.log(`\nInserted:         ${inserted}`);
    console.log(`Already existed:  ${existed}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('FAILED:', e);
    process.exitCode = 1;
  } finally {
    client.release(); await pool.end();
  }
})();
