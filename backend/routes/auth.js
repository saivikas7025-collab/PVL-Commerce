const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { sendOtp } = require("../services/otpService");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function createToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "30d"
        }
    );
}

function normalizePhone(phone) {
    return String(phone || "").replace(/\s+/g, "").trim();
}

function isValidPhone(phone) {
    return /^[0-9]{10,15}$/.test(phone);
}

// --------------------------------------------------
// SEND OTP
// --------------------------------------------------

router.post("/send-otp", async (req, res) => {
    try {
        const phone = normalizePhone(req.body.phone);

        if (!isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid phone number"
            });
        }

        const otp = await sendOtp(phone);

        await pool.query(
            `UPDATE otp_verifications
             SET is_used = true
             WHERE phone = $1
             AND is_used = false`,
            [phone]
        );

        await pool.query(
            `INSERT INTO otp_verifications
             (phone, otp, expires_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '5 minutes')`,
            [phone, otp]
        );

        res.json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error("Send OTP error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to send OTP"
        });
    }
});

// --------------------------------------------------
// VERIFY OTP
// --------------------------------------------------

router.post("/verify-otp", async (req, res) => {
    try {
        const phone = normalizePhone(req.body.phone);
        const otp = String(req.body.otp || "").trim();

        if (!isValidPhone(phone) || !/^[0-9]{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number or OTP"
            });
        }

        const result = await pool.query(
            `SELECT id, phone, otp, expires_at
             FROM otp_verifications
             WHERE phone = $1
             AND otp = $2
             AND is_used = false
             AND expires_at > CURRENT_TIMESTAMP
             ORDER BY id DESC
             LIMIT 1`,
            [phone, otp]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        await pool.query(
            `UPDATE otp_verifications
             SET is_used = true
             WHERE id = $1`,
            [result.rows[0].id]
        );

        await pool.query(
            `UPDATE users
             SET is_verified = true,
                 updated_at = CURRENT_TIMESTAMP
             WHERE phone = $1`,
            [phone]
        );

        const userResult = await pool.query(
            `SELECT id, name, phone, email, role, is_active, is_verified
             FROM users
             WHERE phone = $1
             LIMIT 1`,
            [phone]
        );

        res.json({
            success: true,
            message: "OTP verified successfully",
            user: userResult.rows.length ? userResult.rows[0] : null
        });

    } catch (error) {
        console.error("Verify OTP error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to verify OTP"
        });
    }
});

// --------------------------------------------------
// SIGNUP
// --------------------------------------------------

router.post("/signup", async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            name,
            phone: rawPhone,
            email,
            password,
            otp
        } = req.body;

        const phone = normalizePhone(rawPhone);

        if (!name || !isValidPhone(phone) || !password || !otp) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, password and OTP are required"
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters"
            });
        }

        if (!/^[0-9]{6}$/.test(String(otp))) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        await client.query("BEGIN");

        const existing = await client.query(
            `SELECT id
             FROM users
             WHERE phone = $1
             LIMIT 1`,
            [phone]
        );

        if (existing.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message: "An account with this phone number already exists"
            });
        }

        const otpResult = await client.query(
            `SELECT id
             FROM otp_verifications
             WHERE phone = $1
             AND otp = $2
             AND is_used = false
             AND expires_at > CURRENT_TIMESTAMP
             ORDER BY id DESC
             LIMIT 1`,
            [phone, String(otp)]
        );

        if (otpResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        const passwordHash = await bcrypt.hash(String(password), 12);

        const userResult = await client.query(
            `INSERT INTO users
             (name, phone, email, password_hash, role, is_active, is_verified)
             VALUES ($1, $2, $3, $4, 'customer', true, true)
             RETURNING id, name, phone, email, role, is_active, is_verified`,
            [
                String(name).trim(),
                phone,
                email ? String(email).trim() : null,
                passwordHash
            ]
        );

        const user = userResult.rows[0];

        await client.query(
            `UPDATE otp_verifications
             SET is_used = true
             WHERE id = $1`,
            [otpResult.rows[0].id]
        );

        // carts.user_id is NOT UNIQUE in the existing database,
        // so do not use ON CONFLICT(user_id).
        const cartResult = await client.query(
            `SELECT id
             FROM carts
             WHERE user_id = $1
             LIMIT 1`,
            [user.id]
        );

        if (cartResult.rows.length === 0) {
            await client.query(
                `INSERT INTO carts (user_id)
                 VALUES ($1)`,
                [user.id]
            );
        }

        await client.query("COMMIT");

        const token = createToken(user);

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Signup error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create account"
        });
    } finally {
        client.release();
    }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

router.post("/login", async (req, res) => {
    try {
        const phone = normalizePhone(req.body.phone);
        const password = String(req.body.password || "");

        if (!isValidPhone(phone) || !password) {
            return res.status(400).json({
                success: false,
                message: "Phone number and password are required"
            });
        }

        const result = await pool.query(
            `SELECT id, name, phone, email, password_hash,
                    role, is_active, is_verified
             FROM users
             WHERE phone = $1
             LIMIT 1`,
            [phone]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone number or password"
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Account is inactive"
            });
        }

        if (!user.password_hash) {
            return res.status(401).json({
                success: false,
                message: "Password login is not available for this account"
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone number or password"
            });
        }

        delete user.password_hash;

        const token = createToken(user);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});

// --------------------------------------------------
// CURRENT USER
// --------------------------------------------------

router.get("/me", authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, phone, email, role,
                    is_active, is_verified,
                    created_at, updated_at
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Get current user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get user"
        });
    }
});

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

router.post("/logout", authenticate, async (req, res) => {
    res.json({
        success: true,
        message: "Logout successful"
    });
});


/* ----------------------------------------------------------
   POST /api/auth/admin/google
   Firebase ID token -> verify email is an admin in users table
   -> issue our JWT with role: 'admin'
---------------------------------------------------------- */
router.post('/admin/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const decoded = await verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no email' });
    }

    const r = await pool.query(
      `SELECT id, name, email, phone, role, is_blocked FROM users
       WHERE LOWER(email) = $1 AND role = 'admin' LIMIT 1`,
      [email]
    );
    if (r.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'This Google account is not registered as an admin.',
      });
    }

    const admin = r.rows[0];
    if (admin.is_blocked) {
      return res.status(403).json({ success: false, message: 'Account is blocked.' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'pvl-dev-secret',
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: 'admin',
      },
    });
  } catch (e) {
    console.error('Admin google auth error:', e.message);
    return res.status(401).json({ success: false, message: e.message || 'Google verification failed' });
  }
});

module.exports = router;
