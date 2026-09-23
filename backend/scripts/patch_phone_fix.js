const fs = require('fs');
const path = 'routes/delivery.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

// Remove the phone update — only refresh name (phone is unique across users)
const oldUpdate = `      // Optionally refresh name/phone from the signup form
      await pool.query(
        \`UPDATE users SET name = COALESCE(NULLIF($1,''), name), phone = COALESCE(NULLIF($2,''), phone)
          WHERE id = $3\`,
        [String(name || '').slice(0, 120), String(phone || '').slice(0, 20), userId]
      );`;

const newUpdate = `      // Refresh name only — phone/email are unique across users
      await pool.query(
        \`UPDATE users SET name = COALESCE(NULLIF($1,''), name) WHERE id = $2\`,
        [String(name || '').slice(0, 120), userId]
      );`;

if (src.includes('phone/email are unique')) {
  console.log('Already patched.');
} else if (!src.includes(oldUpdate)) {
  console.error('Anchor not found — printing window:');
  const idx = src.indexOf('reusing existing users.id');
  console.log(JSON.stringify(src.slice(idx - 100, idx + 500)));
  process.exit(1);
} else {
  src = src.replace(oldUpdate, newUpdate);
  console.log('delivery.js: name-only update on existing user.');
}

fs.writeFileSync(path + '.phonefix.bak', before);
fs.writeFileSync(path, src);
console.log('saved.');
