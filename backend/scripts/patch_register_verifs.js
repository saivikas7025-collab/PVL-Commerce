const fs = require('fs');
const path = 'routes/delivery.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (src.includes('driver_verifications (driver_id)')) {
  console.log('Already patched.');
} else {
  // After the delivery_partners INSERT, add a driver_verifications INSERT
  const anchor = `    return res.json({
      success: true, pending: true,
      partnerId: pRes.rows[0].id,`;

  if (!src.includes(anchor)) {
    console.error('Anchor not found');
    process.exit(1);
  }

  const injected = `    // Create the KYC verification row for this driver
    try {
      await pool.query(
        \`INSERT INTO driver_verifications (driver_id) VALUES ($1) ON CONFLICT (driver_id) DO NOTHING\`,
        [pRes.rows[0].id]
      );
    } catch (e) {
      console.error('[driver register] driver_verifications insert failed:', e.message);
    }

    return res.json({
      success: true, pending: true,
      partnerId: pRes.rows[0].id,`;

  src = src.replace(anchor, injected);
  console.log('register handler now creates driver_verifications row.');
}

fs.writeFileSync(path + '.verifs.bak', before);
fs.writeFileSync(path, src);
console.log('saved.');
