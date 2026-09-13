const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120)`);
  console.log('✓ payment_reference column ready');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
