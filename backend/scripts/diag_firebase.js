require('dotenv').config();
const admin = require('firebase-admin');

console.log('\n--- .env ---');
const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
console.log('B64 present:', !!b64, 'length:', b64?.length);

if (!b64) { console.error('MISSING'); process.exit(1); }

const json = Buffer.from(b64, 'base64').toString('utf8');
console.log('\n--- decoded JSON ---');
console.log('first 80 chars:', json.slice(0, 80));

let creds;
try {
  creds = JSON.parse(json);
  console.log('parsed OK');
} catch (e) {
  console.error('JSON parse failed:', e.message);
  process.exit(1);
}

console.log('\n--- credentials ---');
console.log('type:          ', creds.type);
console.log('project_id:    ', creds.project_id);
console.log('client_email:  ', creds.client_email);
console.log('private_key:  ');
console.log('  starts with: ', creds.private_key?.slice(0, 40));
console.log('  ends with:   ', creds.private_key?.slice(-40));
console.log('  length:      ', creds.private_key?.length);
console.log('  has newlines:', creds.private_key?.includes('\n'));

console.log('\n--- firebase-admin init ---');
try {
  admin.initializeApp({ credential: admin.credential.cert(creds), projectId: creds.project_id });
  console.log('init OK');
  console.log('projectId:', admin.app().options.projectId);

  console.log('\n--- verifyIdToken with dummy token ---');
  admin.auth().verifyIdToken('not-a-real-token')
    .then(d => console.log('unexpected success:', d))
    .catch(e => {
      console.log('verify failed (expected):', e.message);
      console.log('error code:', e.code);
      console.log('error stack (first 5 lines):');
      console.log((e.stack || '').split('\n').slice(0, 5).join('\n'));
    });
} catch (e) {
  console.log('init FAILED:', e.message);
  console.log(e.stack);
}
