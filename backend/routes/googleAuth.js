/**
 * Google Sign-In endpoint.
 * POST /api/auth/google
 * Body: { idToken: "<firebase-id-token>" }
 *
 * Verifies the Firebase ID token with the Firebase Admin SDK,
 * finds or creates a CUSTOMER user in PostgreSQL, and returns
 * our own JWT (same shape as phone/password login).
 *
 * Security: The role is ALWAYS 'customer' for Google signups.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');

// firebase-admin v13 modular API
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const router = express.Router();

function ensureFirebase() {
  if (getApps().length > 0) return;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64 || b64.trim() === '') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not set');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(
      Buffer.from(b64, 'base64').toString('utf8')
    );
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not valid JSON');
  }

  initializeApp({
    credential: cert(serviceAccount),
  });

  console.log('[PVL] Firebase Admin SDK initialized');
}

function createToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Google accounts have no phone number. The users.phone column is
// NOT NULL + UNIQUE, so we generate a stable placeholder of the form
// "g_<sha1>" that can never collide with a real 10-digit phone number.
function placeholderPhone(uid) {
  const hash = crypto
    .createHash('sha1')
    .update('google:' + uid)
    .digest('hex')
    .slice(0, 15);
  return 'g_' + hash;
}

router.post('/google', async (req, res) => {
  const client = await pool.connect();
  try {
    ensureFirebase();

    const idToken = String(req.body.idToken || '').trim();
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'idToken is required',
      });
    }

    // 1) Verify the Firebase ID token
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (e) {
      console.error('Firebase verify error:', e.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Google token',
      });
    }

    const firebaseUid = decoded.uid;
    const emailRaw = decoded.email ? String(decoded.email).toLowerCase() : null;
    const name = (decoded.name && String(decoded.name).trim()) ||
                 (emailRaw ? emailRaw.split('@')[0] : 'Google User');

    if (!emailRaw) {
      return res.status(400).json({
        success: false,
        message: 'Google account does not have an email address',
      });
    }

    await client.query('BEGIN');

    // 2) Look up existing user by email
    let userResult = await client.query(
      `SELECT id, name, phone, email, role, is_active, is_verified
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [emailRaw]
    );

    let user;
    let isNewUser = false;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      if (!user.is_active) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: 'Account is inactive',
        });
      }
    } else {
      // 3) Create new CUSTOMER
      const phone = placeholderPhone(firebaseUid);

      const insertResult = await client.query(
        `INSERT INTO users
           (name, phone, email, role, is_active, is_verified)
         VALUES ($1, $2, $3, 'customer', true, true)
         RETURNING id, name, phone, email, role, is_active, is_verified`,
        [name, phone, emailRaw]
      );
      user = insertResult.rows[0];
      isNewUser = true;

      // 4) Ensure the user has a cart row
      const cartResult = await client.query(
        `SELECT id FROM carts WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (cartResult.rows.length === 0) {
        await client.query(
          `INSERT INTO carts (user_id) VALUES ($1)`,
          [user.id]
        );
      }
    }

    await client.query('COMMIT');

    const token = createToken(user);

    return res.json({
      success: true,
      message: 'Google login successful',
      isNewUser,
      token,
      user,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Google login failed',
    });
  } finally {
    client.release();
  }
});

module.exports = router;
