// setup_fruits_veg.js — idempotent
const { Client } = require('pg');

const SECTION      = 'Fruits & Vegetables';
const SECTION_ORD  = 30;                   // same value used in sections table

// [name, display_order, icon, bg_color]
// display_order starts at 301 so it sits under the section header cleanly.
const SUBCATS = [
  ['All Fruits & Vegetables',  301, '\u{1F966}', '#E8F5E9'],
  ['Fresh Vegetables',         302, '\u{1F955}', '#E8F5E9'],
  ['Fresh Fruits',             303, '\u{1F34E}', '#FCE4E4'],
  ['Mangoes & Melons',         304, '\u{1F96D}', '#FCEBC9'],
  ['Seasonal',                 305, '\u{1F343}', '#E8F5E9'],
  ['Exotics',                  306, '\u{1F95D}', '#E8F5E9'],
  ['Freshly Cut & Sprouts',    307, '\u{1F331}', '#E8F5E9'],
  ['Frozen Veg',               308, '\u{1F9CA}', '#E1F5FE'],
  ['Leafies & Herbs',          309, '\u{1F33F}', '#E8F5E9'],
  ['Trusted Organic',          310, '\u{1F33E}', '#E8F5E9'],
  ['Flowers & Leaves',         311, '\u{1F490}', '#FCE4EC'],
  ['Hydroponic',               312, '\u{1F4A7}', '#E3F2FD'],
  ['Combo & Recipes',          313, '\u{1F374}', '#FFF3E0'],
  ['Fresh Juice & Dips',       314, '\u{1F9C3}', '#FFE0B2'],
  ['Salad Bar',                315, '\u{1F957}', '#E8F5E9'],
  ['Apples & Pears',           316, '\u{1F350}', '#FCE4E4'],
];

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // make sure the section row itself exists & is active
  await c.query(`
    INSERT INTO sections (name, display_order, icon, bg_color, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    ON CONFLICT (name) DO UPDATE
      SET display_order = EXCLUDED.display_order,
          icon          = EXCLUDED.icon,
          bg_color      = EXCLUDED.bg_color,
          is_active     = TRUE
  `, [SECTION, SECTION_ORD, '\u{1F966}', '#E8F5E9']);
  console.log(`[OK] section ready: ${SECTION}`);

  let created = 0, updated = 0;

  for (const [name, order, icon, bg] of SUBCATS) {
    const ex = await c.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [name]);

    if (ex.rows.length) {
      await c.query(`
        UPDATE categories
           SET section       = $1,
               section_order = $2,
               display_order = $3,
               icon          = COALESCE(NULLIF(icon, ''), $4),
               bg_color      = COALESCE(NULLIF(bg_color, ''), $5),
               is_active     = TRUE
         WHERE id = $6
      `, [SECTION, SECTION_ORD, order, icon, bg, ex.rows[0].id]);
      updated++;
      console.log(`  [UPD] ${name.padEnd(26)} #${ex.rows[0].id}`);
    } else {
      const ins = await c.query(`
        INSERT INTO categories
          (name, is_active, section, section_order, display_order,
           icon, bg_color, created_at)
        VALUES ($1, TRUE, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id
      `, [name, SECTION, SECTION_ORD, order, icon, bg]);
      created++;
      console.log(`  [NEW] ${name.padEnd(26)} #${ins.rows[0].id}`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Created:  ${created}`);
  console.log(`Updated:  ${updated}`);

  const check = await c.query(`
    SELECT name, display_order, icon
      FROM categories
     WHERE section = $1
     ORDER BY display_order NULLS LAST, name
  `, [SECTION]);
  console.log(`\nSubcategories under "${SECTION}": ${check.rowCount}`);
  check.rows.forEach(r =>
    console.log(`  ${String(r.display_order).padStart(4)}  ${r.icon || ' '}  ${r.name}`));

  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
