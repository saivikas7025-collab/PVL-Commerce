const fs = require('fs');
const file = 'services/firebaseAuth.js';

const newContent = `/**
 * Firebase Admin verification helper.
 * Reads FIREBASE_SERVICE_ACCOUNT_B64 (base64 of the service account JSON)
 * and exposes verifyIdToken() used by the store + customer Google routes.
 *
 * Compatible with firebase-admin v11 through v14+.
 */
const admin = require('firebase-admin');
let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64 || !b64.trim()) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 not configured on the server');
  }

  const json = Buffer.from(b64, 'base64').toString('utf8');
  let creds;
  try {
    creds = JSON.parse(json);
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not valid JSON: ' + e.message);
  }

  // Normalize private key newlines (in case they survived as literal \\n)
  if (creds.private_key && typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\\\n/g, '\\n');
  }

  // firebase-admin v13+ removed admin.apps from the top-level API.
  // Just attempt initializeApp; a duplicate-init error means we're already good.
  try {
    admin.initializeApp({
      credential: admin.credential.cert(creds),
      projectId: creds.project_id,
    });
  } catch (e) {
    const msg = String(e && e.message || '');
    if (!/already exists|duplicate/i.test(msg)) {
      throw e;
    }
    // else: already initialized — safe to continue
  }

  initialized = true;
  return admin;
}

async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing idToken');
  }
  const app = initFirebase();
  const decoded = await app.auth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email || null,
    name: decoded.name || null,
    picture: decoded.picture || null,
    emailVerified: decoded.email_verified === true,
  };
}

module.exports = { verifyIdToken };
`;

fs.writeFileSync(file, newContent);
console.log('firebaseAuth.js rewritten for firebase-admin v14');
