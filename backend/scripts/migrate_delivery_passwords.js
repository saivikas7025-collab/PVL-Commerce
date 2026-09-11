// One-time migration: hash any plaintext delivery-partner passwords.
// Safe to run multiple times. Skips rows already in bcrypt format.
// NEVER prints password or hash values.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const BCRYPT_COST = 12;
const BCRYPT_REGEX = /^\$2[aby]\$[0-9]{2}\$/;

(async () => {
  const client = await pool.connect();
  let migrated = 0;
  let skipped = 0;

  try {
    const { rows } = await client.query(
      `SELECT id, phone, password_hash
       FROM users
       WHERE role = 'delivery_partner'
       ORDER BY id`
    );

    console.log(`Found ${rows.length} delivery partner(s) to inspect.`);

    for (const row of rows) {
      const stored = row.password_hash;

      if (!stored || typeof stored !== 'string' || stored.length === 0) {
        console.log(`[SKIP]   id=${row.id} phone=${row.phone} reason=empty`);
        skipped++;
        continue;
      }

      if (BCRYPT_REGEX.test(stored)) {
        console.log(`[SKIP]   id=${row.id} phone=${row.phone} reason=already-bcrypt`);
        skipped++;
        continue;
      }

      const hash = await bcrypt.hash(stored, BCRYPT_COST);

      await client.query(
        `UPDATE users
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND role = 'delivery_partner'`,
        [hash, row.id]
      );

      console.log(`[MIGRATED] id=${row.id} phone=${row.phone}`);
      migrated++;
    }

    console.log(`\nSummary: ${migrated} migrated, ${skipped} skipped.`);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
