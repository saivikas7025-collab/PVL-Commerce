const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT id, name, rating, rating_note, bio, tagline FROM delivery_partners LIMIT 5").catch(e => ({ error: e.message }));
  if (r.error) { console.log('Column error:', r.error); }
  else { console.log(JSON.stringify(r.rows, null, 2)); }
  // List all text columns on delivery_partners
  const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='delivery_partners' AND data_type IN ('text','character varying')");
  console.log('\nText columns on delivery_partners:');
  for (const row of cols.rows) console.log('  ' + row.column_name);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
