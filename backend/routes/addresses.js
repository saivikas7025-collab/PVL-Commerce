const express = require("express");
const { pool } = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// --------------------------------------------------
// VALIDATION HELPERS
// --------------------------------------------------

function clean(value) {
    return String(value ?? "").trim();
}

function validateAddress(body) {
    const label = clean(body.label || "Home");
    const fullAddress = clean(body.full_address);
    const city = clean(body.city);
    const state = clean(body.state);
    const pincode = clean(body.pincode);

    if (!["Home", "Work", "Other"].includes(label)) {
        return "Label must be Home, Work or Other";
    }

    if (!fullAddress) {
        return "Full address is required";
    }

    if (!city) {
        return "City is required";
    }

    if (!state) {
        return "State is required";
    }

    if (!/^[0-9]{4,10}$/.test(pincode)) {
        return "Enter a valid pincode";
    }

    return null;
}

// --------------------------------------------------
// GET MY ADDRESSES
// --------------------------------------------------

router.get("/", authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                user_id,
                label,
                full_address,
                city,
                state,
                pincode,
                latitude,
                longitude,
                is_default,
                created_at,
                updated_at
             FROM addresses
             WHERE user_id = $1
             ORDER BY is_default DESC, id DESC`,
            [req.userId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            addresses: result.rows
        });
    } catch (error) {
        console.error("Get addresses error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get addresses"
        });
    }
});

// --------------------------------------------------
// GET ONE ADDRESS
// --------------------------------------------------

router.get("/:id", authenticate, async (req, res) => {
    try {
        const addressId = Number(req.params.id);

        if (!Number.isInteger(addressId) || addressId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID"
            });
        }

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                label,
                full_address,
                city,
                state,
                pincode,
                latitude,
                longitude,
                is_default,
                created_at,
                updated_at
             FROM addresses
             WHERE id = $1
             AND user_id = $2`,
            [addressId, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Address not found"
            });
        }

        res.json({
            success: true,
            address: result.rows[0]
        });
    } catch (error) {
        console.error("Get address error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get address"
        });
    }
});

// --------------------------------------------------
// ADD ADDRESS
// --------------------------------------------------

router.post("/", authenticate, async (req, res) => {
    const client = await pool.connect();

    try {
        const validationError = validateAddress(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const label = clean(req.body.label || "Home");
        const fullAddress = clean(req.body.full_address);
        const city = clean(req.body.city);
        const state = clean(req.body.state);
        const pincode = clean(req.body.pincode);

        const latitude =
            req.body.latitude === null ||
            req.body.latitude === undefined ||
            req.body.latitude === ""
                ? null
                : Number(req.body.latitude);

        const longitude =
            req.body.longitude === null ||
            req.body.longitude === undefined ||
            req.body.longitude === ""
                ? null
                : Number(req.body.longitude);

        const requestedDefault =
            req.body.is_default === true ||
            req.body.is_default === "true";

        if (
            latitude !== null &&
            (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude"
            });
        }

        if (
            longitude !== null &&
            (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid longitude"
            });
        }

        await client.query("BEGIN");

        const countResult = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM addresses
             WHERE user_id = $1`,
            [req.userId]
        );

        const isFirstAddress = countResult.rows[0].count === 0;
        const makeDefault = requestedDefault || isFirstAddress;

        if (makeDefault) {
            await client.query(
                `UPDATE addresses
                 SET is_default = false,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1`,
                [req.userId]
            );
        }

        const result = await client.query(
            `INSERT INTO addresses
                (
                    user_id,
                    label,
                    full_address,
                    city,
                    state,
                    pincode,
                    latitude,
                    longitude,
                    is_default
                )
             VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING
                id,
                user_id,
                label,
                full_address,
                city,
                state,
                pincode,
                latitude,
                longitude,
                is_default,
                created_at,
                updated_at`,
            [
                req.userId,
                label,
                fullAddress,
                city,
                state,
                pincode,
                latitude,
                longitude,
                makeDefault
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Address added successfully",
            address: result.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Add address error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add address"
        });
    } finally {
        client.release();
    }
});

// --------------------------------------------------
// UPDATE ADDRESS
// --------------------------------------------------

router.put("/:id", authenticate, async (req, res) => {
    const client = await pool.connect();

    try {
        const addressId = Number(req.params.id);

        if (!Number.isInteger(addressId) || addressId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID"
            });
        }

        const validationError = validateAddress(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const existing = await client.query(
            `SELECT id
             FROM addresses
             WHERE id = $1
             AND user_id = $2`,
            [addressId, req.userId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Address not found"
            });
        }

        const label = clean(req.body.label || "Home");
        const fullAddress = clean(req.body.full_address);
        const city = clean(req.body.city);
        const state = clean(req.body.state);
        const pincode = clean(req.body.pincode);

        const latitude =
            req.body.latitude === null ||
            req.body.latitude === undefined ||
            req.body.latitude === ""
                ? null
                : Number(req.body.latitude);

        const longitude =
            req.body.longitude === null ||
            req.body.longitude === undefined ||
            req.body.longitude === ""
                ? null
                : Number(req.body.longitude);

        const requestedDefault =
            req.body.is_default === true ||
            req.body.is_default === "true";

        await client.query("BEGIN");

        if (requestedDefault) {
            await client.query(
                `UPDATE addresses
                 SET is_default = false,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1
                 AND id <> $2`,
                [req.userId, addressId]
            );
        }

        const result = await client.query(
            `UPDATE addresses
             SET
                label = $1,
                full_address = $2,
                city = $3,
                state = $4,
                pincode = $5,
                latitude = $6,
                longitude = $7,
                is_default = $8,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $9
             AND user_id = $10
             RETURNING
                id,
                user_id,
                label,
                full_address,
                city,
                state,
                pincode,
                latitude,
                longitude,
                is_default,
                created_at,
                updated_at`,
            [
                label,
                fullAddress,
                city,
                state,
                pincode,
                latitude,
                longitude,
                requestedDefault,
                addressId,
                req.userId
            ]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Address updated successfully",
            address: result.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Update address error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update address"
        });
    } finally {
        client.release();
    }
});

// --------------------------------------------------
// SET DEFAULT ADDRESS
// --------------------------------------------------

router.put("/:id/default", authenticate, async (req, res) => {
    const client = await pool.connect();

    try {
        const addressId = Number(req.params.id);

        if (!Number.isInteger(addressId) || addressId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID"
            });
        }

        await client.query("BEGIN");

        const existing = await client.query(
            `SELECT id
             FROM addresses
             WHERE id = $1
             AND user_id = $2`,
            [addressId, req.userId]
        );

        if (existing.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Address not found"
            });
        }

        await client.query(
            `UPDATE addresses
             SET is_default = false,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [req.userId]
        );

        const result = await client.query(
            `UPDATE addresses
             SET is_default = true,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             AND user_id = $2
             RETURNING
                id,
                user_id,
                label,
                full_address,
                city,
                state,
                pincode,
                latitude,
                longitude,
                is_default,
                created_at,
                updated_at`,
            [addressId, req.userId]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Default address updated successfully",
            address: result.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Set default address error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to set default address"
        });
    } finally {
        client.release();
    }
});

// --------------------------------------------------
// DELETE ADDRESS
// --------------------------------------------------

router.delete("/:id", authenticate, async (req, res) => {
    const client = await pool.connect();

    try {
        const addressId = Number(req.params.id);

        if (!Number.isInteger(addressId) || addressId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID"
            });
        }

        await client.query("BEGIN");

        const existing = await client.query(
            `SELECT id, is_default
             FROM addresses
             WHERE id = $1
             AND user_id = $2`,
            [addressId, req.userId]
        );

        if (existing.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Address not found"
            });
        }

        const wasDefault = existing.rows[0].is_default;

        await client.query(
            `DELETE FROM addresses
             WHERE id = $1
             AND user_id = $2`,
            [addressId, req.userId]
        );

        // If the deleted address was the default,
        // automatically make the newest remaining address default.
        if (wasDefault) {
            await client.query(
                `UPDATE addresses
                 SET is_default = true,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (
                     SELECT id
                     FROM addresses
                     WHERE user_id = $1
                     ORDER BY id DESC
                     LIMIT 1
                 )`,
                [req.userId]
            );
        }

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Address deleted successfully"
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Delete address error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete address"
        });
    } finally {
        client.release();
    }
});

module.exports = router;
