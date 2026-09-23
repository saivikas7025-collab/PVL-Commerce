const fs = require('fs');
const file = 'services/firebaseAuth.js';
let src = fs.readFileSync(file, 'utf8');

// Replace the init block with a version-safe version
const oldInit = `  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  }`;

const newInit = `  // Version-safe init (works on firebase-admin v10–v14)
  const apps = (admin && typeof admin.apps !== 'undefined' && Array.isArray(admin.apps))
    ? admin.apps
    : [];
  if (apps.length === 0) {
    if (typeof admin.initializeApp !== 'function') {
      throw new Error('firebase-admin initializeApp not available; check installed version');
    }
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  }`;

if (!src.includes(oldInit)) {
  console.error('marker not found — dumping current init block');
  const idx = src.indexOf('initializeApp');
  console.log(src.slice(Math.max(0, idx - 400), idx + 200));
  process.exit(1);
}

src = src.replace(oldInit, newInit);
fs.writeFileSync(file, src);
console.log('firebaseAuth.js patched');
