require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    console.log('=== Before ===');
    const { rows: before } = await pool.query(
      `SELECT id, doc_type, front_url, status FROM driver_documents WHERE driver_id=1 ORDER BY id`);
    for (const r of before) console.log(' ', r);

    // Delete orphan rows that point to local-storage hex filenames
    // (they look like "abc123.png" — 16 hex chars + extension, no dashes)
    const { rowCount } = await pool.query(`
      DELETE FROM driver_documents
       WHERE driver_id = 1
         AND front_url ~ '^[0-9a-f]{16}\\.(jpg|jpeg|png|pdf|heic|heif)$'
    `);
    console.log('\nDeleted', rowCount, 'orphan local-storage rows.');

    // Reset checklist counters
    await pool.query(`
      UPDATE driver_verifications
         SET identity_status='pending', dl_status='pending', rc_status='pending',
             insurance_status='pending', address_status='pending', selfie_status='pending',
             bank_status='pending', updated_at=now()
       WHERE driver_id = 1
    `);
    console.log('Reset driver_verifications row for driver 1.');

    const { rows: after } = await pool.query(
      `SELECT id, doc_type, front_url, status FROM driver_documents WHERE driver_id=1 ORDER BY id`);
    console.log('\n=== After ===');
    for (const r of after) console.log(' ', r);
    if (after.length === 0) console.log('  (empty — ready for fresh uploads)');
  } finally { await pool.end(); }
})();
