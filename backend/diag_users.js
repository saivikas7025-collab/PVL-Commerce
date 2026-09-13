const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
  for (const row of r.rows) console.log('  ' + row.column_name + ' (' + row.data_type + ')');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
