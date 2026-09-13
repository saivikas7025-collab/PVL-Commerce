const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'addresses' ORDER BY ordinal_position`);
  console.log('addresses columns:');
  for (const row of r.rows) console.log('  ' + row.column_name + ' (' + row.data_type + ')');
  const r2 = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position`);
  console.log('\norders columns:');
  console.log('  ' + r2.rows.map(x => x.column_name).join(', '));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
