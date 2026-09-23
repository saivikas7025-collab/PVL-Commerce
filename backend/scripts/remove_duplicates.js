// backend/scripts/remove_duplicates.js
// Removes product duplicates (exact-name + imported-with-size-suffix).
// Default: dry-run (only reports). Use --apply to actually delete.
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

// ---------- helpers ----------
function canonicalSize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.\-_()]/g, '');
}

// Split "Coca-Cola Soft Drink 750 ml" -> { base: "Coca-Cola Soft Drink", size: "750 ml" }
// Split "Frooti Refreshing Mango Drink 10 x 150 ml" -> { base: "Frooti Refreshing Mango Drink", size: "10 x 150 ml" }
// Split "French Beans - 250 g" -> { base: "French Beans", size: "250 g" }
// Split "Name (750 ml)" -> { base: "Name", size: "750 ml" }
function splitNameAndSize(name) {
  const n = (name || '').trim();
  const patterns = [
    /^(.*?)\s+(\d+\s*x\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))$/i,
    /^(.*?)\s+(\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))$/i,
    /^(.*?)\s*[-–—]\s*(\d+\s*x\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))$/i,
    /^(.*?)\s*[-–—]\s*(\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))$/i,
    /^(.*?)\s*\(\s*(\d+\s*x\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*\)$/i,
    /^(.*?)\s*\(\s*(\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*\)$/i,
  ];
  for (const re of patterns) {
    const m = n.match(re);
    if (m) return { base: m[1].trim(), size: m[2].trim() };
  }
  return { base: n, size: '' };
}

function score(p) {
  let s = 0;
  const notes = (p.store_notes || '');
  if (!notes) s += 100;
  else if (/imported from supplied pvl/i.test(notes)) s += 50;
  else if (/imported by import_pvl_products_v2/i.test(notes)) s += 0;
  const u = (p.unit || '').toLowerCase().trim();
  if (u && u !== '1 unit') s += 30;
  const pr = Number(p.price);
  if (pr && pr !== 99) s += 20;
  if (p.image_url) s += 10;
  if (p.description && p.description !== p.name) s += 5;
  s -= p.id / 1000000;
  return s;
}

(async () => {
  const client = await pool.connect();
  try {
    const { rows: products } = await client.query(`
      SELECT p.id, p.category_id, p.name, p.unit, p.price, p.image_url, p.store_notes,
             c.name AS category_name, c.section
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.store_id = 1
    `);
    console.log(`Total products (store_id=1): ${products.length}`);

    // Fast lookup for originals in each category
    const byCat = new Map();
    for (const p of products) {
      const k = p.category_id;
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k).push(p);
    }

    const toDelete = new Map(); // id -> { product, keeper, reason }

    // --- Rule A: exact (category_id + LOWER(name)) duplicates ---
    const nameGroups = new Map();
    for (const p of products) {
      const k = `${p.category_id}|||${p.name.toLowerCase().trim()}`;
      if (!nameGroups.has(k)) nameGroups.set(k, []);
      nameGroups.get(k).push(p);
    }
    for (const [, g] of nameGroups) {
      if (g.length < 2) continue;
      const sorted = [...g].sort((a, b) => score(b) - score(a));
      const keeper = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        toDelete.set(sorted[i].id, {
          product: sorted[i],
          keeper,
          reason: `exact-dup of #${keeper.id}`,
        });
      }
    }

    // --- Rule B: imported name has trailing size; original has base name + matching unit ---
    for (const p of products) {
      if (toDelete.has(p.id)) continue;
      const notes = p.store_notes || '';
      if (!/(imported from supplied pvl|imported by import_pvl_products_v2)/i.test(notes)) continue;

      const { base, size } = splitNameAndSize(p.name);
      if (!size) continue;
      const cSize = canonicalSize(size);
      if (!cSize) continue;

      const candidates = byCat.get(p.category_id) || [];
      let match = null;
      for (const other of candidates) {
        if (other.id === p.id) continue;
        if (toDelete.has(other.id)) continue;
        const oNotes = other.store_notes || '';
        // Only compare against original seed (notes = null) or other well-kept rows
        if (oNotes && /imported/i.test(oNotes) && !/imported from supplied pvl/i.test(oNotes)) {
          // Skip other v2 entries - we want to prefer the older one
        }
        if (other.name.toLowerCase().trim() !== base.toLowerCase()) continue;
        if (canonicalSize(other.unit) !== cSize) continue;
        match = other;
        break;
      }

      if (match) {
        toDelete.set(p.id, {
          product: p,
          keeper: match,
          reason: `imported "${p.name}" matches original "${match.name}" (${match.unit}) #${match.id}`,
        });
      }
    }

    // ---------- report ----------
    console.log(`\nDuplicates to delete: ${toDelete.size}`);
    if (toDelete.size === 0) {
      console.log('Nothing to delete.');
      return;
    }

    const byCategory = new Map();
    for (const { product } of toDelete.values()) {
      const k = product.category_name || 'UNKNOWN';
      byCategory.set(k, (byCategory.get(k) || 0) + 1);
    }
    console.log('\nBreakdown by category:');
    for (const [cat, cnt] of [...byCategory.entries()].sort()) {
      console.log(`  ${cat}: ${cnt}`);
    }

    console.log('\nSample (first 25 pairs):');
    let i = 0;
    for (const [, { product, keeper, reason }] of toDelete) {
      if (i++ >= 25) break;
      console.log(`  DELETE #${product.id} "${product.name}" [u=${product.unit}]  ->  KEEP #${keeper.id} "${keeper.name}" [u=${keeper.unit}]`);
    }
    if (toDelete.size > 25) console.log(`  ... and ${toDelete.size - 25} more`);

    if (!APPLY) {
      console.log('\n--dry-run only. Run with `--apply` to delete.');
      return;
    }

    // ---------- apply ----------
    const ids = [...toDelete.keys()];
    await client.query('BEGIN');
    const res = await client.query('DELETE FROM products WHERE id = ANY($1::int[])', [ids]);
    await client.query('COMMIT');
    console.log(`\nDeleted: ${res.rowCount}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('ERROR:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();