const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // 1) products table schema
  const p = await c.query(`SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position`);
  console.log('\n=== products columns ===');
  for (const r of p.rows) console.log(`  ${r.column_name.padEnd(25)} ${r.data_type.padEnd(20)} nullable=${r.is_nullable} default=${r.column_default || '-'}`);

  // 2) categories table schema
  const cat = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='categories' ORDER BY ordinal_position`);
  console.log('\n=== categories columns ===');
  for (const r of cat.rows) console.log(`  ${r.column_name.padEnd(25)} ${r.data_type}`);

  // 3) Current counts
  const pc = await c.query(`SELECT COUNT(*)::int AS n FROM products`);
  const cc = await c.query(`SELECT COUNT(*)::int AS n FROM categories`);
  console.log(`\n=== Current counts ===`);
  console.log(`  products:   ${pc.rows[0].n}`);
  console.log(`  categories: ${cc.rows[0].n}`);

  // 4) Sample products (first 5)
  const sample = await c.query(`SELECT * FROM products LIMIT 5`);
  console.log('\n=== Sample 5 products ===');
  for (const r of sample.rows) console.log(JSON.stringify(r));

  // 5) Existing categories
  const allcat = await c.query(`SELECT * FROM categories ORDER BY id LIMIT 30`);
  console.log('\n=== Existing categories ===');
  for (const r of allcat.rows) console.log(`  ${r.id}: ${r.name}`);

  // 6) Stores
  const st = await c.query(`SELECT id, name, is_active FROM stores ORDER BY id`);
  console.log('\n=== Stores ===');
  for (const r of st.rows) console.log(`  ${r.id}: ${r.name} (active=${r.is_active})`);

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
