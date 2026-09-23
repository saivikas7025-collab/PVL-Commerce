// backend/scripts/import_vegetables_fruits.js
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
const SECTION = 'Fruits & Vegetables';
const SOURCE = path.join(__dirname, '..', 'sources', 'vegetables_fruits_raw.md');

function parseFile() {
  // Strip all backslashes (they escape markdown chars in the paste)
  const raw = fs.readFileSync(SOURCE, 'utf8').replace(/\\/g, '');
  const lines = raw.split(/\r?\n/);
  let subcat = null;
  let firstBetel = false, seenTrusted = false;
  const rows = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Section-header detection (works now that backslashes are gone)
    if (/from the loaded Blinkit .*Vegetables & Fruits/i.test(t)) { subcat = 'Fresh Vegetables'; continue; }
    if (/from the Blinkit \*\*Fresh Fruits\*\*/i.test(t)) { subcat = 'Fresh Fruits'; continue; }
    if (/from the Blinkit \*\*Mangoes & Melons\*\*/i.test(t)) { subcat = 'Mangoes & Melons'; continue; }
    if (/from the Blinkit \*\*Seasonal\*\*/i.test(t)) { subcat = 'Seasonal'; continue; }
    if (/from the Blinkit \*\*Exotics\*\*/i.test(t)) { subcat = 'Exotics'; continue; }

    // Plain-list block boundaries
    if (/^Brown Coconut Chunks\s*-\s*₹/.test(t)) subcat = 'Freshly Cut & Sprouts';
    if (/^Pluckk Frozen Blueberry\s*-\s*₹/.test(t)) subcat = 'Frozen Veg';
    if (/^Organically Grown Ginger \(Adrak\)\s*-\s*₹/.test(t)) { subcat = 'Trusted Organic'; seenTrusted = true; }
    if (/^Betel Leaves \(Paan Patta\)\s*-\s*₹/.test(t)) {
      if (!firstBetel) { subcat = 'Leafies & Herbs'; firstBetel = true; }
      else if (seenTrusted) { subcat = 'Flowers & Leaves'; }
    }
    if (/^Hydroponic Sweet Bell Pepper \(Cocktail\)\s*-\s*₹/.test(t)) subcat = 'Hydroponic';
    if (/^Portion Pumpkin\s*-\s*500 g\s*-\s*₹/.test(t)) subcat = 'Combo & Recipes';
    if (/^Krishi Cress Basil Pesto/.test(t)) subcat = 'Fresh Juice & Dips';
    if (/^Banana\s*-\s*3 pcs\s*-\s*₹/.test(t)) subcat = 'All Fruits & Vegetables';
    if (/^Washington Red Delicious Apple\s*-\s*250 g\s*-\s*₹/.test(t)) subcat = 'Apples & Pears';

    // Table row
    if (t.startsWith('|')) {
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
      if (!/^\d+$/.test(cells[0])) continue;
      const name = (cells[2] || '').trim();
      const size = (cells[3] || '').trim();
      if (!name || !subcat) continue;
      if (/—|-{2,}/.test(name)) continue;
      rows.push({ subcategory: subcat, name, unit: size || '1 unit' });
      continue;
    }

    // Plain line "Name - ₹X" or "Name - size - ₹X"
    if (t.includes(' - ₹') && !/^(Note|This|Here|Extracted)/.test(t)) {
      const parts = t.split(' - ');
      const name = parts[0].trim();
      if (!name || name.length < 3) continue;
      if (/^(Vegetables|Fresh Vegetables|Fresh Fruits|Mangoes|Seasonal|Exotics|Freshly|Frozen|Leafies|Trusted|Flowers|Hydroponic|Combo|All Fruits|Salad|Apples)/i.test(name)) continue;
      let size = '';
      if (parts[1] && !/^₹/.test(parts[1].trim())) size = parts[1].trim();
      if (!subcat) continue;
      rows.push({ subcategory: subcat, name, unit: size || '1 unit' });
    }
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
  for (const [s, n] of [...bySub.entries()].sort()) console.log(`  ${s.padEnd(28)} ${n}`);

  const client = await pool.connect();
  try {
    const { rows: cats } = await client.query(`SELECT id, name FROM categories WHERE section = $1`, [SECTION]);
    const catMap = new Map(cats.map(c => [c.name.toLowerCase().trim(), c.id]));
    console.log(`\nDB categories in "${SECTION}": ${cats.length}`);

    const missing = new Set(), insertable = [];
    for (const r of unique) {
      const id = catMap.get(r.subcategory.toLowerCase().trim());
      if (!id) { missing.add(r.subcategory); continue; }
      insertable.push({ ...r, categoryId: id });
    }
    console.log(`Insertable:       ${insertable.length}`);
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
         `Imported from vegetables_fruits_raw | ${SECTION} > ${r.subcategory}`, '🛒', '#F5F5F5']
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
