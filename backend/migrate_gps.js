const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const stmts = [
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(10,7)`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(10,7)`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS gps_distance_meters INTEGER`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_allowed BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_block_reason TEXT`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_store_at TIMESTAMP`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_driver_at TIMESTAMP`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id INTEGER`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`,
  ];
  for (const s of stmts) {
    try { await c.query(s); console.log('✓', s.slice(0, 60) + '...'); }
    catch (e) { console.log('✗', s.slice(0, 60), e.message); }
  }

  console.log('\n✅ ORDERS TABLE UPDATED FOR GPS + TRACKING');
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
