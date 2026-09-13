const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const stmts = [
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved'`,
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128)`,
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS approved_by VARCHAR(120)`,
  ];
  for (const s of stmts) {
    try { await c.query(s); console.log('✓', s.slice(0, 70)); }
    catch (e) { console.log('✗', e.message); }
  }
  // Backfill — existing stores become approved
  await c.query(`UPDATE stores SET approval_status = 'approved' WHERE approval_status IS NULL`);
  console.log('\n✅ STORES MIGRATION DONE');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
