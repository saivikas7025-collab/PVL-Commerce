const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const stmts = [
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved'`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE`,
  ];
  for (const s of stmts) {
    try { await c.query(s); console.log('✓', s.slice(0, 70)); }
    catch (e) { console.log('✗', e.message); }
  }
  await c.query(`UPDATE delivery_partners SET approval_status = 'approved' WHERE approval_status IS NULL`);
  console.log('\n✅ MIGRATION DONE');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
