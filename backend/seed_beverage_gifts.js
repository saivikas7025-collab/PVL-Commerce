const { Client } = require('pg');
const ITEMS = [
  ['Frooti Mango Drink Beverage Gift Pack','10 x 150 ml',99,125],
  ['Real Beverage Gift Pack','3 ltr',249,499],
  ['Davidoff Premium Instant Coffee','200 g',1700,1999],
  ['Twinings The Royal British Garden Assorted Green Tea Bags','66 g',200,499],
  ['May & Co. Gift Pack','1 pack',1999,2899],
  ['Sober Monkey Zero Sugar Lemon Soda Water & Tonic Water','4 x 250 ml',380,400],
  ['Real Greetings Handle Beverage Gift Pack (Small)','6 x 180 ml',94,140],
  ["Jimmy's - Cocktail Mix Celebration Pack",'12 x 250 ml',1328,1500],
];
const CAT = 'Beverage Gift Packs';
const STORE_ID = 1;

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  let catId;
  const ex = await c.query("SELECT id FROM categories WHERE LOWER(name) = LOWER($1)", [CAT]);
  if (ex.rows.length) { catId = ex.rows[0].id; console.log(`[EXISTS] ${CAT} (id=${catId})`); }
  else {
    const ins = await c.query(
      `INSERT INTO categories (name, is_active, section, section_order, display_order, created_at)
       VALUES ($1, TRUE, 'Beverages', 200, 200, CURRENT_TIMESTAMP) RETURNING id`, [CAT]);
    catId = ins.rows[0].id; console.log(`[NEW] ${CAT} (id=${catId})`);
  }
  let n = 0;
  for (const [name, unit, price, mrp] of ITEMS) {
    const chk = await c.query("SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND store_id = $2", [name, STORE_ID]);
    if (chk.rows.length) continue;
    const m = name.match(/mango|frooti|real|juice|coffee|tea|soda|tonic/i);
    const icon = /coffee/i.test(name) ? '\u{2615}' : /tea/i.test(name) ? '\u{1F375}' : /mango|frooti/i.test(name) ? '\u{1F96D}' : '\u{1F964}';
    const bg = /coffee/i.test(name) ? '#F5EAD4' : /tea/i.test(name) ? '#E8F5E9' : /mango|frooti/i.test(name) ? '#FCEBC9' : '#FFF3E0';
    await c.query(
      `INSERT INTO products (category_id, name, description, unit, price, original_price, image_url, is_active, store_id, approval_status, icon, bg_color)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, TRUE, $7, 'approved', $8, $9)`,
      [catId, name, `${name} - quality assured.`, unit, price, mrp > price ? mrp : null, STORE_ID, icon, bg]);
    n++;
  }
  console.log(`Inserted: ${n}`);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
