/**
 * Firebase Admin verification helper.
 * Reads FIREBASE_SERVICE_ACCOUNT_B64 (base64 of the service account JSON)
 * and exposes verifyIdToken() used by the store + customer Google routes.
 */
let admin = null;
let initialized = false;

function initFirebase() {
  if (initialized) return admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    throw new Error('firebase-admin not installed');
  }
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64 || !b64.trim()) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 not configured on the server');
  }
  const json = Buffer.from(b64, 'base64').toString('utf8');
  const creds = JSON.parse(json);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
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
