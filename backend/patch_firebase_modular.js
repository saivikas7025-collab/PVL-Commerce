const fs = require('fs');
const file = 'services/firebaseAuth.js';

const newContent = `/**
 * Firebase Admin verification helper — firebase-admin v14 modular API.
 * Reads FIREBASE_SERVICE_ACCOUNT_B64 (base64 of the service account JSON).
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let initialized = false;

function initFirebase() {
  if (initialized) return;

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

  // Normalize private key newlines
  if (creds.private_key && typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\\\n/g, '\\n');
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(creds),
      projectId: creds.project_id,
    });
  }

  initialized = true;
}

async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing idToken');
  }
  initFirebase();
  const decoded = await getAuth().verifyIdToken(idToken);
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
console.log('firebaseAuth.js rewritten for firebase-admin v14 modular API');
