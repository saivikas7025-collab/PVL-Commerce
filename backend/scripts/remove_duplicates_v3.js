// backend/scripts/remove_duplicates_v3.js
// Size-aware dedup. Deletes an IMPORTED product only when it can be matched
// to an ORIGINAL product (store_notes = NULL) with the same base name AND the
// same size (both sides normalized).
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

// --- size helpers -----------------------------------------------------
function canonicalSize(s) {
  if (!s) return '';
  let x = String(s).toLowerCase().trim();
  x = x.replace(/\blitres?\b/g, 'l');
  x = x.replace(/\bltrs?\b/g, 'l');
  x = x.replace(/\bliters?\b/g, 'l');
  x = x.replace(/\bgrams?\b/g, 'g');
  x = x.replace(/\bgms?\b/g, 'g');
  x = x.replace(/\bkilograms?\b/g, 'kg');
  x = x.replace(/\bkgs?\b/g, 'kg');
  x = x.replace(/\bmls?\b/g, 'ml');
  x = x.replace(/\bpieces?\b/g, 'pc');
  x = x.replace(/\bpcs?\b/g, 'pc');
  x = x.replace(/[^\w\sx]/g, '');
  x = x.replace(/\s*x\s*/g, 'x');
  x = x.replace(/\s+/g, '');
  return x;
}

// Extract trailing size from name, if present.
// "Coca-Cola Soft Drink 750 ml" -> { base: "Coca-Cola Soft Drink", size: "750ml" }
// "French Beans - 250 g"        -> { base: "French Beans", size: "250g" }
// "Frooti Mango Drink 2 Ltr"    -> { base: "Frooti Mango Drink", size: "2l" }
// "Mogu Mogu Mango 10 x 125 ml" -> { base: "Mogu Mogu Mango", size: "10x125ml" }
function splitName(name) {
  const n = (name || '').trim();
  const pats = [
    /^(.*?)\s+(\d+\s*x\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*$/i,
    /^(.*?)\s+(\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*$/i,
    /^(.*?)\s*[-–—]\s*(\d+\s*x\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*$/i,
    /^(.*?)\s*[-–—]\s*(\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*$/i,
    /^(.*?)\s*\(\s*(\d+\s*x\s*\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*\)\s*$/i,
    /^(.*?)\s*\(\s*(\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|g|gm|gms|kg|pcs?|pc))\s*\)\s*$/i,
  ];
  for (const re of pats) {
    const m = n.match(re);
    if (m) return { base: m[1].trim(), size: canonicalSize(m[2]) };
  }
  return { base: n, size: '' };
}

function normalizeBase(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(soft drink|fruit drink|flavoured drink|sparkling drink|mango drink|fruit juice|drink|juice|beverage)\b/g, '')
    .replace(/[^\w\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isImported(p) {
  return /imported/i.test(p.store_notes || '');
}

// Get {base, size} for a product, using unit as fallback for size.
function signature(p) {
  const fromName = splitName(p.name);
  if (fromName.size) {
    return { base: normalizeBase(fromName.base), size: fromName.size };
  }
  const u = (p.unit || '').trim();
  if (u && u.toLowerCase() !== '1 unit') {
    return { base: normalizeBase(p.name), size: canonicalSize(u) };
  }
  return { base: normalizeBase(p.name), size: '' };
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

    const byCat = new Map();
    for (const p of products) {
      if (!byCat.has(p.category_id)) byCat.set(p.category_id, []);
      byCat.get(p.category_id).push(p);
    }

    const toDelete = new Map();

    // Rule A: exact name + category match
    const groups = new Map();
    for (const p of products) {
      const k = `${p.category_id}|||${p.name.toLowerCase().trim()}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    }
    for (const [, g] of groups) {
      if (g.length < 2) continue;
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
          reason: `exact-dup of #${keeper.id}`,
        });
      }
    }

    // Rule B: size-aware match against original
    for (const p of products) {
      if (toDelete.has(p.id)) continue;
      if (!isImported(p)) continue;

      const sig = signature(p);
      if (!sig.base) continue;

      const candidates = byCat.get(p.category_id) || [];
      let match = null;
      for (const other of candidates) {
        if (other.id === p.id) continue;
        if (toDelete.has(other.id)) continue;
        if (isImported(other)) continue; // prefer originals only

        const otherSig = signature(other);
        if (otherSig.base !== sig.base) continue;

        // Sizes must match. Empty size matches empty size.
        if (sig.size !== otherSig.size) continue;

        match = other;
        break;
      }

      if (match) {
        toDelete.set(p.id, {
          product: p,
          reason: `"${p.name}" [${p.unit}] -> "${match.name}" [${match.unit}] #${match.id}`,
        });
      }
    }

    console.log(`\nDuplicates to delete: ${toDelete.size}`);
    if (toDelete.size === 0) {
      console.log('Nothing to delete.');
      return;
    }

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

    console.log('\nSample (first 30):');
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