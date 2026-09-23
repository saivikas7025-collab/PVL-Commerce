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
const SECTION = 'Cold Drinks & Juices';
const SOURCE = path.join(__dirname, '..', 'sources', 'cold_drinks_raw.md');

const MARKERS = [
  { re: /^Frooti Mango Drink Beverage Gift Pack - ₹99/, cat: 'Beverages Gift Packs' },
  { re: /^Coca-Cola Soft Drink - ₹39 \(750 ml\)\s*$/, cat: 'Soft Drinks' },
  { re: /^Paper Boat Jamun, Fruit Juice/, cat: 'Fruit Juice' },
  { re: /^Frooti Mango Drink Beverage Gift Pack \(10 x 150 ml\) - ₹99/, cat: 'Mango Drinks' },
  { re: /^Real Activ Cranberry Juice \(1 ltr\) - ₹145/, cat: 'Pure Juices' },
  { re: /^Hommade Lemoneez Syrup \(250 ml\) - ₹81/, cat: 'Concentrates & Syrups' },
  { re: /^Sharmayu Amla Juice \(1000 ml\) - ₹201/, cat: 'Herbal Drinks' },
  { re: /^Extracted products:\s*$/, cat: 'Energy Drinks' },
  { re: /^1\. Real Activ Coconut Water Refreshing Hydration — ₹180/, cat: 'Coconut Water' },
  { re: /^Extracted products from the page:\s*$/, cat: 'Lassi, Shakes & More' },
  { re: /^Water & Ice Cubes\s*$/, cat: 'Water & Ice Cubes' },
  { re: /^Cold Coffee & Ice Tea\s*$/, cat: 'Cold Coffee & Ice Tea' },
  { re: /Soda & Mixers.*page:/i, cat: 'Soda & Mixers' },
  { re: /Imported Beverages.*page:/i, cat: 'Imported Beverages' },
  { re: /^Additional pack\/variant options/i, cat: null },
];

function extractProduct(line) {
  let m = line.match(/^\d+\.\s+(.+?)\s+—\s+(.+?)\s+—\s+₹([\d,]+)/);
  if (m) return { name: m[1].trim(), size: m[2].trim() };
  m = line.match(/^\d+\.\s+(.+?)\s+—\s+₹([\d,]+)/);
  if (m) return { name: m[1].trim(), size: '' };
  m = line.match(/^(.+?)\s+-\s+₹([\d,]+)\s+\((.+?)\)\s+-\s+/);
  if (m) return { name: m[1].trim(), size: m[3].trim() };
  m = line.match(/^(.+?)\s+-\s+₹([\d,]+)\s+\((.+?)\)\s*$/);
  if (m) return { name: m[1].trim(), size: m[3].trim() };
  m = line.match(/^(.+?)\s+-\s+₹([\d,]+)\s*$/);
  if (m) return { name: m[1].trim(), size: '' };
  return null;
}

function parseFile() {
  const raw = fs.readFileSync(SOURCE, 'utf8').replace(/\\/g, '');
  const lines = raw.split(/\r?\n/);
  let cat = null;
  const rows = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let matchedMarker = false;
    for (const m of MARKERS) {
      if (m.re.test(t)) { cat = m.cat; matchedMarker = true; break; }
    }
    if (matchedMarker) continue;
    if (/^(Note:|This is|Extracted |Here are|Additional pack)/.test(t)) continue;
    const prod = extractProduct(t);
    if (!prod) continue;
    if (!cat) continue;
    rows.push({ subcategory: cat, name: prod.name, unit: prod.size || '1 unit' });
  }
  return rows;
}

(async () => {
  const rows = parseFile();
  console.log(`Parsed rows:      ${rows.length}`);
  const seen = new Set(), unique = [];
  for (const r of rows) {
    const k = `${r.subcategory}|||${r.name.toLowerCase()}|||${r.unit.toLowerCase()}`;
    if (seen.has(k)) continue; seen.add(k); unique.push(r);
  }
  console.log(`Unique rows:      ${unique.length}`);
  const bySub = new Map();
  for (const r of unique) bySub.set(r.subcategory, (bySub.get(r.subcategory) || 0) + 1);
  console.log('\nBy subcategory:');
  for (const [s, n] of [...bySub.entries()].sort()) console.log(`  ${s.padEnd(25)} ${n}`);

  const client = await pool.connect();
  try {
    const { rows: cats } = await client.query(`SELECT id, name FROM categories WHERE section = $1`, [SECTION]);
    const catMap = new Map(cats.map(c => [c.name.toLowerCase().trim(), c.id]));
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
      console.log('\nSample (first 20):');
      for (const r of insertable.slice(0, 20)) console.log(`  [${r.subcategory}] ${r.name} (${r.unit})`);
      return;
    }

    await client.query('BEGIN');
    let inserted = 0, existed = 0;
    for (const r of insertable) {
      const dup = await client.query(
        `SELECT 1 FROM products WHERE store_id=$1 AND category_id=$2 AND LOWER(name)=LOWER($3) LIMIT 1`,
        [STORE_ID, r.categoryId, r.name]
      );
      if (dup.rowCount) { existed++; continue; }
      await client.query(
        `INSERT INTO products (category_id,name,description,unit,price,original_price,image_url,is_active,subcategory_id,store_id,approval_status,store_notes,icon,bg_color)
         VALUES ($1,$2,$3,$4,$5,$5,NULL,TRUE,NULL,$6,'approved',$7,$8,$9)`,
        [r.categoryId, r.name, r.name, r.unit, 99, STORE_ID,
         `Imported from cold_drinks_raw | ${SECTION} > ${r.subcategory}`, '🛒', '#F5F5F5']
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
  } finally { client.release(); await pool.end(); }
})();
