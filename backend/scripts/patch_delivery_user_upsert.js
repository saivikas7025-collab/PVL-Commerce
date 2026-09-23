const fs = require('fs');
const path = 'routes/delivery.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

const oldBlock = `    // Create a users row (used as the profile holder)
    const userRes = await pool.query(
      \`INSERT INTO users (name, phone, email, role, created_at)
       VALUES ($1, $2, $3, 'delivery_partner', CURRENT_TIMESTAMP)
       RETURNING id\`,
      [String(name || decoded.name || 'Partner').slice(0, 120), String(phone || '').slice(0, 20), gEmail]
    );
    const userId = userRes.rows[0].id;`;

const newBlock = `    // Reuse existing users row if the email already exists (customer/store/driver/etc.)
    let userId = null;
    const existingUser = await pool.query(
      \`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1\`,
      [gEmail]
    );
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      // Optionally refresh name/phone from the signup form
      await pool.query(
        \`UPDATE users SET name = COALESCE(NULLIF($1,''), name), phone = COALESCE(NULLIF($2,''), phone)
          WHERE id = $3\`,
        [String(name || '').slice(0, 120), String(phone || '').slice(0, 20), userId]
      );
      console.log('[driver register] reusing existing users.id =', userId, 'for', gEmail);
    } else {
      const userRes = await pool.query(
        \`INSERT INTO users (name, phone, email, role, created_at)
         VALUES ($1, $2, $3, 'delivery_partner', CURRENT_TIMESTAMP)
         RETURNING id\`,
        [String(name || decoded.name || 'Partner').slice(0, 120), String(phone || '').slice(0, 20), gEmail]
      );
      userId = userRes.rows[0].id;
      console.log('[driver register] created new users.id =', userId, 'for', gEmail);
    }`;

if (src.includes('reusing existing users.id')) {
  console.log('Already patched.');
} else if (!src.includes(oldBlock)) {
  console.error('Anchor not found. Printing current lines around INSERT INTO users:');
  const idx = src.indexOf("INSERT INTO users (name, phone, email, role, created_at)");
  console.log(JSON.stringify(src.slice(Math.max(0, idx - 200), idx + 400)));
  process.exit(1);
} else {
  src = src.replace(oldBlock, newBlock);
  console.log('delivery.js: user upsert patched.');
}

fs.writeFileSync(path + '.userupsert.bak', before);
fs.writeFileSync(path, src);
console.log('saved.');
