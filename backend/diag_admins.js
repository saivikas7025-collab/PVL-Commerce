const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`SELECT id, name, email, phone, role FROM users WHERE role = 'admin' LIMIT 5`);
  console.log('Admin users:');
  for (const row of r.rows) console.log('  id=' + row.id + ' email=' + (row.email || '(none)') + ' phone=' + row.phone + ' name=' + row.name);
  if (r.rows.length === 0) console.log('  ⚠ No admin users found — need to create one');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
