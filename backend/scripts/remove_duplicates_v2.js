// backend/scripts/remove_duplicates_v2.js
// Robust dedup: for every imported product, normalize its name (strip
// trailing size + common noise words) and look for an ORIGINAL product
// (store_notes = NULL) in the same category with the same normalized name.
// If found, delete the imported one.
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

// Strip trailing size tokens from a name.
function stripSize(name) {
  if (!name) return '';
  let n = name;
  const patterns = [
    /\s+\d+\s*x\s*\d+(?:\.\d+)?\s*(ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc)\s*$/i,
    /\s+\d+(?:\.\d+)?\s*(ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc)\s*$/i,
    /\s*[-–—]\s*\d+\s*x\s*\d+(?:\.\d+)?\s*(ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc)\s*$/i,
    /\s*[-–—]\s*\d+(?:\.\d+)?\s*(ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc)\s*$/i,
    /\s*\(\s*\d+\s*x\s*\d+(?:\.\d+)?\s*(ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc)\s*\)\s*$/i,
    /\s*\(\s*\d+(?:\.\d+)?\s*(ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc)\s*\)\s*$/i,
  ];
  for (const re of patterns) {
    if (re.test(n)) {
      n = n.replace(re, '');
      break;
    }
  }
  return n.trim();
}

// Normalize: lowercase, strip noise words, keep & and letters/digits/spaces.
function normalize(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(soft drink|fruit drink|flavoured drink|drink|juice|beverage)\b/g, '')
    .replace(/[^\w\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isImported(p) {
  return /imported/i.test(p.store_notes || '');
}

(async () => {
  const client = await pool.connect();
  try {
    const { rows: products } = await client.query(`
      SELECT p.id, p.category_id, p.name, p.unit, p.store_notes
      FROM products p
      WHERE p.store_id = 1
    `);
    console.log(`Total products (store_id=1): ${products.length}`);

    // Group by category
    const byCat = new Map();
    for (const p of products) {
      if (!byCat.has(p.category_id)) byCat.set(p.category_id, []);
      byCat.get(p.category_id).push(p);
    }

    const toDelete = new Map();

    // --- Rule A: exact name match within a category ---
    const nameGroups = new Map();
    for (const p of products) {
      const k = `${p.category_id}|||${p.name.toLowerCase().trim()}`;
      if (!nameGroups.has(k)) nameGroups.set(k, []);
      nameGroups.get(k).push(p);
    }
    for (const [, g] of nameGroups) {
      if (g.length < 2) continue;
      // Prefer non-imported, then lower id
      const sorted = [...g].sort((a, b) => {
        const ai = isImported(a) ? 1 : 0;
        const bi = isImported(b) ? 1 : 0;
        if (ai !== bi) return ai - bi;
        return a.id - b.id;
      });
      const keeper = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        toDelete.set(sorted[i].id, {
          product: sorted[i],
          keeper,
          reason: `exact-dup of #${keeper.id}`,
        });
      }
    }

    // --- Rule B: imported name matches a normalized original name ---
    for (const p of products) {
      if (toDelete.has(p.id)) continue;
      if (!isImported(p)) continue;

      const baseNorm = normalize(stripSize(p.name));
      if (!baseNorm) continue;

      const candidates = byCat.get(p.category_id) || [];
      let match = null;
      for (const other of candidates) {
        if (other.id === p.id) continue;
        if (toDelete.has(other.id)) continue;
        if (isImported(other)) continue; // keep originals only
        const otherNorm = normalize(stripSize(other.name));
        if (otherNorm === baseNorm) {
          match = other;
          break;
        }
      }

      if (match) {
        toDelete.set(p.id, {
          product: p,
          keeper: match,
          reason: `"${p.name}" -> "${match.name}" [#${match.id}]`,
        });
      }
    }

    console.log(`\nDuplicates to delete: ${toDelete.size}`);
    if (toDelete.size === 0) {
      console.log('Nothing to delete.');
      return;
    }

    // Breakdown by category
    const cats = await client.query(`SELECT id, name FROM categories`);
    const catName = new Map(cats.rows.map(r => [r.id, r.name]));
    const byCatCount = new Map();
    for (const v of toDelete.values()) {
      const n = catName.get(v.product.category_id) || 'UNKNOWN';
      byCatCount.set(n, (byCatCount.get(n) || 0) + 1);
    }
    console.log('\nBreakdown by category:');
    for (const [c, n] of [...byCatCount.entries()].sort()) {
      console.log(`  ${c}: ${n}`);
    }

    console.log('\nSample (first 30 pairs):');
    let i = 0;
    for (const v of toDelete.values()) {
      if (i++ >= 30) break;
      console.log(`  DEL #${v.product.id}  ${v.reason}`);
    }
    if (toDelete.size > 30) console.log(`  ... +${toDelete.size - 30} more`);

    if (!APPLY) {
      console.log('\n--dry-run only. Run with --apply to delete.');
      return;
    }

    const ids = [...toDelete.keys()];
    await client.query('BEGIN');
    const res = await client.query('DELETE FROM products WHERE id = ANY($1::int[])', [ids]);
    await client.query('COMMIT');
    console.log(`\nDeleted: ${res.rowCount}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();