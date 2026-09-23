const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%categor%'");
  console.log('Category-related tables:');
  for (const row of r.rows) console.log('  ' + row.table_name);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
