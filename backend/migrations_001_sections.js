// migrations_001_sections.js  —  safe to re-run
const { Client } = require('pg');

const SECTIONS = [
  ['Paan Corner',               10, '\u{1F343}', '#E8F5E9'],
  ['Dairy, Bread & Eggs',       20, '\u{1F95B}', '#F0F7FF'],
  ['Fruits & Vegetables',       30, '\u{1F966}', '#E8F5E9'],
  ['Cold Drinks & Juices',      40, '\u{1F964}', '#FFF3E0'],
  ['Snacks & Munchies',         50, '\u{1F35F}', '#FFF9C4'],
  ['Breakfast & Instant Food',  60, '\u{1F963}', '#FCEBC9'],
  ['Sweet Tooth',               70, '\u{1F36B}', '#F5EAD4'],
  ['Bakery & Biscuits',         80, '\u{1F36A}', '#FFF3C4'],
  ['Tea, Coffee & Milk Drinks', 90, '\u2615\uFE0F', '#F5EAD4'],
  ['Atta, Rice & Dal',         100, '\u{1F33E}', '#FCEBC9'],
  ['Masala, Oil & More',       110, '\u{1F336}\uFE0F', '#FFE0B2'],
  ['Sauces & Spreads',         120, '\u{1F96B}', '#FCE4EC'],
  ['Chicken, Meat & Fish',     130, '\u{1F357}', '#FCE4E4'],
  ['Organic & Healthy Living', 140, '\u{1F33F}', '#E8F5E9'],
  ['Baby Care',                150, '\u{1F37C}', '#FCE4EC'],
  ['Pharma & Wellness',        160, '\u{1F48A}', '#F0F7FF'],
  ['Cleaning Essentials',      170, '\u{1F9F4}', '#E3F2FD'],
  ['Home & Office',            180, '\u{1F3E0}', '#F0F7FF'],
  ['Personal Care',            190, '\u{1F9FC}', '#FCE4EC'],
  ['Pet Care',                 200, '\u{1F43E}', '#FFF3C4'],
];

const DRINK_SUBCATS = {
  'Soft Drinks':           401,
  'Fruit Juice':           402,
  'Mango Drinks':          403,
  'Pure Juices':           404,
  'Concentrates & Syrups': 405,
  'Herbal Drinks':         406,
  'Energy Drinks':         407,
  'Coconut Water':         408,
  'Water & Ice Cubes':     409,
  'Cold Coffee & Ice Tea': 410,
  'Soda & Mixers':         411,
  'Imported Beverages':    412,
  'Lassi, Shakes & More':  413,
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // 1a. sections table
  await c.query(`
    CREATE TABLE IF NOT EXISTS sections (
      name          TEXT PRIMARY KEY,
      display_order INTEGER NOT NULL DEFAULT 0,
      icon          TEXT,
      bg_color      TEXT DEFAULT '#F4F4F5',
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  console.log('[OK] sections table ready');

  // 1b. upsert sections
  for (const [name, ord, icon, bg] of SECTIONS) {
    await c.query(`
      INSERT INTO sections (name, display_order, icon, bg_color, is_active)
      VALUES ($1,$2,$3,$4,TRUE)
      ON CONFLICT (name) DO UPDATE
        SET display_order = EXCLUDED.display_order,
            icon          = EXCLUDED.icon,
            bg_color      = EXCLUDED.bg_color,
            is_active     = TRUE
    `, [name, ord, icon, bg]);
  }
  console.log(`[OK] sections upserted: ${SECTIONS.length}`);

  // 1c. normalise every drink subcategory onto Cold Drinks & Juices
  for (const [catName, order] of Object.entries(DRINK_SUBCATS)) {
    const r = await c.query(`
      UPDATE categories
         SET section       = 'Cold Drinks & Juices',
             section_order = 40,
             display_order = $1,
             is_active     = TRUE
       WHERE LOWER(name) = LOWER($2)
    `, [order, catName]);
    console.log(`    ${catName.padEnd(26)} -> rows updated: ${r.rowCount}`);
  }

  // 1d. force emoji presentation for ambiguous codepoints
  const fix = await c.query(`
    UPDATE products
       SET icon = icon || chr(65039)
     WHERE icon IN (chr(9889), chr(9749), chr(127869))
  `);
  console.log(`[OK] emoji variation selectors added: ${fix.rowCount} rows`);

  // 1e. sanity report
  const orphans = await c.query(
    "SELECT id, name FROM categories WHERE section IS NULL OR section = ''");
  if (orphans.rowCount) {
    console.log(`[WARN] ${orphans.rowCount} categories still have no section:`);
    orphans.rows.forEach(r => console.log(`        #${r.id}  ${r.name}`));
  } else {
    console.log('[OK] no orphan categories');
  }

  const s = await c.query("SELECT COUNT(*)::int n FROM sections");
  const c2 = await c.query("SELECT COUNT(*)::int n FROM categories WHERE is_active = TRUE");
  const p = await c.query("SELECT COUNT(*)::int n FROM products WHERE is_active = TRUE AND approval_status='approved'");
  console.log(`\n--- totals ---`);
  console.log(`sections   : ${s.rows[0].n}`);
  console.log(`categories : ${c2.rows[0].n}`);
  console.log(`products   : ${p.rows[0].n}`);

  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
