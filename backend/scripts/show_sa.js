require('dotenv').config({ quiet: true });
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  || process.env.FIREBASE_SERVICE_ACCOUNT
  || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!raw) { console.error('No service account found under any known key'); process.exit(1); }
let s = raw.trim();
if (!s.startsWith('{')) s = Buffer.from(s, 'base64').toString('utf8');
const j = JSON.parse(s);
console.log('');
console.log('==================================================');
console.log('  CLIENT EMAIL — paste this into Drive Share:');
console.log('');
console.log('    ' + j.client_email);
console.log('');
console.log('  project_id: ' + j.project_id);
console.log('==================================================');
console.log('');
