const fs = require('fs');
const file = 'scripts/diag_firebase.js';
let src = fs.readFileSync(file, 'utf8');
const oldLine = `  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  }`;
const newLine = `  admin.initializeApp({ credential: admin.credential.cert(creds), projectId: creds.project_id });`;
if (src.includes(oldLine)) {
  src = src.replace(oldLine, newLine);
  fs.writeFileSync(file, src);
  console.log('diag script patched');
} else {
  console.log('marker not found in diag script');
}
