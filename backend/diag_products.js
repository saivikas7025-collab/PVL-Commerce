const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const counts = await c.query(`
    SELECT
      (SELECT COUNT(*)::int FROM products) AS total_products,
      (SELECT COUNT(*)::int FROM products WHERE is_active = true) AS active_products,
      (SELECT COUNT(*)::int FROM products WHERE approval_status = 'pending')  AS pending,
      (SELECT COUNT(*)::int FROM products WHERE approval_status = 'approved') AS approved,
      (SELECT COUNT(*)::int FROM products WHERE approval_status = 'rejected') AS rejected
  `);
  console.log('\n=== Product counts ===');
  console.log(JSON.stringify(counts.rows[0], null, 2));

  const sample = await c.query(`
    SELECT p.id, p.name, p.approval_status, p.is_active,
           c.name AS category, p.store_id, p.price
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.id DESC LIMIT 10
  `);
  console.log('\n=== Last 10 products ===');
  for (const r of sample.rows) {
    console.log(`  id=${r.id} "${r.name}" cat=${r.category} status=${r.approval_status} active=${r.is_active} store=${r.store_id} ₹${r.price}`);
  }

  console.log('\n=== Store product routes (in storeDashboard.js) ===');
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
