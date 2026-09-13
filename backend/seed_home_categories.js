const { Client } = require('pg');

const CATEGORIES = [
  // --- Stores in spotlight ---
  { section:'Stores in spotlight', order:1, name:'Ice Cream Store',         icon:'🍦', color:'#D6E8F7' },
  { section:'Stores in spotlight', order:2, name:'Travel Store',            icon:'✈️', color:'#D5EDE0' },
  { section:'Stores in spotlight', order:3, name:'Hobby Store',             icon:'🎨', color:'#E8DFF5' },
  { section:'Stores in spotlight', order:4, name:'Sports Store',            icon:'🏀', color:'#DFF5E0' },

  // --- Picks for your lifestyle ---
  { section:'Picks for your lifestyle', order:1, name:'Spiritual Needs',    icon:'🕉️', color:'#FAF0DC' },
  { section:'Picks for your lifestyle', order:2, name:'Pet Store',          icon:'🐾', color:'#FAEEDC' },
  { section:'Picks for your lifestyle', order:3, name:'Fashion Basics',     icon:'👕', color:'#E0E7F5' },
  { section:'Picks for your lifestyle', order:4, name:'Toy Store',          icon:'🧸', color:'#FCE5E0' },
  { section:'Picks for your lifestyle', order:5, name:'Book Store',         icon:'📚', color:'#F0E6DC' },
  { section:'Picks for your lifestyle', order:6, name:'Pharma Store',       icon:'💊', color:'#D6EEF8' },
  { section:'Picks for your lifestyle', order:7, name:'E-Gifts Store',      icon:'🎁', color:'#FAF0D9' },
  { section:'Picks for your lifestyle', order:8, name:'Jewellery Store',    icon:'💍', color:'#FCE4EF' },

  // --- Beauty & Personal Care ---
  { section:'Beauty & Personal Care', order:1, name:'Bath & Body',          icon:'🧴', color:'#D6E8F7' },
  { section:'Beauty & Personal Care', order:2, name:'Hair',                 icon:'💇', color:'#EFDFF5' },
  { section:'Beauty & Personal Care', order:3, name:'Skin & Face',          icon:'🧖', color:'#FCE8DC' },
  { section:'Beauty & Personal Care', order:4, name:'Beauty & Cosmetics',   icon:'💄', color:'#FBE0E8' },
  { section:'Beauty & Personal Care', order:5, name:'Feminine Hygiene',     icon:'🌸', color:'#FCE4EF' },
  { section:'Beauty & Personal Care', order:6, name:'Baby Care',            icon:'👶', color:'#E0F5F0' },
  { section:'Beauty & Personal Care', order:7, name:'Health & Pharma',      icon:'💪', color:'#F5E0E0' },
  { section:'Beauty & Personal Care', order:8, name:'Sexual Wellness',      icon:'❤️', color:'#FCE8F0' },

  // --- Household Essentials ---
  { section:'Household Essentials', order:1, name:'Home & Lifestyle',       icon:'🏠', color:'#EFE6DC' },
  { section:'Household Essentials', order:2, name:'Cleaners & Repellents',  icon:'🧽', color:'#DEEBF8' },
  { section:'Household Essentials', order:3, name:'Electronics',            icon:'📱', color:'#E0EEF5' },
  { section:'Household Essentials', order:4, name:'Stationery & Games',     icon:'✏️', color:'#FAF0DC' },

  // --- Grocery & Kitchen ---
  { section:'Grocery & Kitchen', order:1, name:'Vegetables & Fruits',       icon:'🥕', color:'#DFF0D8' },
  { section:'Grocery & Kitchen', order:2, name:'Atta, Rice & Dal',          icon:'🌾', color:'#F5EFD8' },
  { section:'Grocery & Kitchen', order:3, name:'Oil, Ghee & Masala',        icon:'🫙', color:'#FCE4C8' },
  { section:'Grocery & Kitchen', order:4, name:'Dairy, Bread & Eggs',       icon:'🥛', color:'#F5F5DC' },
  { section:'Grocery & Kitchen', order:5, name:'Bakery & Biscuits',         icon:'🍪', color:'#FAF0DC' },
  { section:'Grocery & Kitchen', order:6, name:'Dry Fruits & Cereals',      icon:'🥜', color:'#F5E8D0' },
  { section:'Grocery & Kitchen', order:7, name:'Chicken, Meat & Fish',      icon:'🍗', color:'#FCE0E0' },
  { section:'Grocery & Kitchen', order:8, name:'Kitchenware & Appliances',  icon:'🍳', color:'#F5E5D5' },

  // --- Snacks & Drinks ---
  { section:'Snacks & Drinks', order:1, name:'Chips & Namkeen',             icon:'🍟', color:'#F5EED8' },
  { section:'Snacks & Drinks', order:2, name:'Sweets & Chocolates',         icon:'🍫', color:'#F5E0E8' },
  { section:'Snacks & Drinks', order:3, name:'Drinks & Juices',             icon:'🥤', color:'#F5F5D8' },
  { section:'Snacks & Drinks', order:4, name:'Tea, Coffee & Milk Drinks',   icon:'☕', color:'#E8DCC8' },
  { section:'Snacks & Drinks', order:5, name:'Instant Food',                icon:'🍜', color:'#F0E0D0' },
  { section:'Snacks & Drinks', order:6, name:'Sauces & Spreads',            icon:'🥫', color:'#F5D8D8' },
  { section:'Snacks & Drinks', order:7, name:'Paan Corner',                 icon:'🍃', color:'#E0F0E0' },
  { section:'Snacks & Drinks', order:8, name:'Ice Creams & More',           icon:'🍨', color:'#FCE8DC' },
];

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('BEGIN');
  try {
    // 1) Add columns (safe if already exist)
    console.log('Adding columns to categories...');
    await c.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS section       VARCHAR(60)`);
    await c.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS section_order INT DEFAULT 99`);
    await c.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0`);
    await c.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon          VARCHAR(30)`);
    await c.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS bg_color      VARCHAR(10)`);

    // 2) Save existing category ids for reassigning products
    const old = await c.query(`SELECT id, name FROM categories`);
    const oldMap = {};
    for (const r of old.rows) oldMap[r.name] = r.id;
    console.log('Existing categories:', JSON.stringify(oldMap));

    // 3) Insert new categories (skip if name already exists)
    console.log('\nInserting new categories...');
    const insertedNames = {};
    for (const cat of CATEGORIES) {
      const existing = await c.query(
        `SELECT id FROM categories WHERE name = $1 LIMIT 1`, [cat.name]);

      if (existing.rows.length > 0) {
        // Update existing row with section/icon/color
        await c.query(
          `UPDATE categories
             SET section=$1, section_order=$2, display_order=$3, icon=$4, bg_color=$5, is_active=true
           WHERE id=$6`,
          [cat.section, cat.order, cat.order, cat.icon, cat.color, existing.rows[0].id]);
        insertedNames[cat.name] = existing.rows[0].id;
      } else {
        const r = await c.query(
          `INSERT INTO categories (name, section, section_order, display_order, icon, bg_color, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
          [cat.name, cat.section, cat.order, cat.order, cat.icon, cat.color]);
        insertedNames[cat.name] = r.rows[0].id;
      }
    }
    console.log('Inserted/updated ' + Object.keys(insertedNames).length + ' categories');

    // 4) Reassign old products to matching new categories
    console.log('\nReassigning existing products...');
    const moves = [
      { from: ['Fruits', 'Vegetables'],             to: 'Vegetables & Fruits' },
      { from: ['Dairy & Eggs'],                     to: 'Dairy, Bread & Eggs' },
      { from: ['Snacks & Biscuits'],                to: 'Bakery & Biscuits' },
      { from: ['Beverages'],                        to: 'Drinks & Juices' },
      { from: ['Household'],                        to: 'Home & Lifestyle' },
    ];
    for (const m of moves) {
      const fromIds = m.from.map(n => oldMap[n]).filter(Boolean);
      const toId = insertedNames[m.to];
      if (!toId || fromIds.length === 0) continue;
      const r = await c.query(
        `UPDATE products SET category_id=$1 WHERE category_id = ANY($2::int[]) RETURNING id`,
        [toId, fromIds]);
      console.log(`  ${m.from.join(', ')} → ${m.to} (${r.rows.length} products moved)`);
    }

    // 5) Delete old leftover categories
    const leftovers = Object.keys(oldMap).filter(n => !insertedNames[n]);
    if (leftovers.length > 0) {
      await c.query(`DELETE FROM categories WHERE name = ANY($1)`, [leftovers]);
      console.log('Deleted old categories: ' + leftovers.join(', '));
    }

    await c.query('COMMIT');
    console.log('\n✅ PHASE 1 COMPLETE');
    console.log('   Total categories: ' + Object.keys(insertedNames).length);
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
