const bcrypt = require('bcryptjs');
const express = require("express");
const router = express.Router();

// Reuse the shared pool from ../db (supports DATABASE_URL + SSL for Render)
const { pool } = require('../db');

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sendError(res, status, message, error = null) {
  console.error("DELIVERY API ERROR:", message, error || "");
  return res.status(status).json({
    success: false,
    message,
  });
}

/*
|--------------------------------------------------------------------------
| DELIVERY PARTNER LOGIN
|--------------------------------------------------------------------------
| Development login.
| The current database stores the test password in users.password_hash.
| Replace this with bcrypt/argon2 before production.
*/
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        u.id AS user_id,
        u.name,
        u.phone,
        u.email,
        u.password_hash,
        u.role,
        u.is_active,

        dp.id AS delivery_partner_id,
        dp.vehicle_type,
        dp.vehicle_number,
        dp.is_online,
        dp.is_available,
        dp.current_latitude,
        dp.current_longitude,
        dp.approval_status,
        dp.rejection_reason

      FROM users u
      INNER JOIN delivery_partners dp
        ON dp.user_id = u.id

      WHERE u.phone = $1
        AND u.role = 'delivery_partner'
        AND u.is_active = true

      LIMIT 1
      `,
      [String(phone).trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid delivery partner credentials",
      });
    }

    const driver = result.rows[0];
    const validPassword = driver.password_hash
      ? await bcrypt.compare(String(password), String(driver.password_hash))
      : false;

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid delivery partner credentials",
      });
    }

    delete driver.password_hash;

    // ---- Approval gate ----
    const _appr = (driver.approval_status || 'approved').toLowerCase();
    if (_appr === 'pending') {
      return res.status(200).json({
        success: false,
        pending: true,
        partnerId: driver.delivery_partner_id,
        message: 'Your account is awaiting admin approval.',
      });
    }
    if (_appr === 'rejected') {
      return res.status(200).json({
        success: false,
        rejected: true,
        reason: driver.rejection_reason || 'Contact support.',
        message: 'Your application was rejected.',
      });
    }

    return res.json({
      success: true,
      message: "Login successful",
      partnerId: driver.delivery_partner_id,
      userId: driver.user_id,
      partner: driver,
    });
  } catch (error) {
    return sendError(res, 500, "Delivery login failed", error);
  }
});

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/
router.get("/dashboard/:partnerId", async (req, res) => {
  try {
    const partnerId = toNumber(req.params.partnerId);

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery partner ID",
      });
    }

    const partnerResult = await pool.query(
      `
      SELECT
        dp.id,
        dp.user_id,
        dp.vehicle_type,
        dp.vehicle_number,
        dp.is_online,
        dp.is_available,
        dp.current_latitude,
        dp.current_longitude,
        u.name,
        u.phone,
        u.email
      FROM delivery_partners dp
      INNER JOIN users u ON u.id = dp.user_id
      WHERE dp.id = $1
      `,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    const statsResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE da.status IN ('assigned', 'accepted')
        )::int AS active_orders,

        COUNT(*) FILTER (
          WHERE o.status = 'delivered'
          AND o.updated_at::date = CURRENT_DATE
        )::int AS delivered_today,

        COUNT(*) FILTER (
          WHERE o.status = 'cancelled'
          AND o.updated_at::date = CURRENT_DATE
        )::int AS cancelled_today,

        COALESCE(
          SUM(o.delivery_fee) FILTER (
            WHERE o.status = 'delivered'
            AND o.updated_at::date = CURRENT_DATE
          ),
          0
        )::numeric AS delivery_fee_today

      FROM delivery_assignments da
      INNER JOIN orders o ON o.id = da.order_id
      WHERE da.delivery_partner_id = $1
      `,
      [partnerId]
    );

    const recentOrdersResult = await pool.query(
      `
      SELECT
        o.id,
        o.store_id,
        o.status,
        o.subtotal,
        o.delivery_fee,
        o.discount,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.created_at,
        o.updated_at,

        da.id AS delivery_assignment_id,
        da.status AS assignment_status,
        da.assigned_at,
        da.picked_up_at,
        da.delivered_at

      FROM delivery_assignments da
      INNER JOIN orders o ON o.id = da.order_id

      WHERE da.delivery_partner_id = $1

      ORDER BY o.created_at DESC
      LIMIT 10
      `,
      [partnerId]
    );

    return res.json({
      success: true,
      partner: partnerResult.rows[0],
      stats: statsResult.rows[0],
      recentOrders: recentOrdersResult.rows,
    });
  } catch (error) {
    return sendError(res, 500, "Could not load delivery dashboard", error);
  }
});

/*
|--------------------------------------------------------------------------
| DELIVERY ORDERS
|--------------------------------------------------------------------------
| Returns:
| 1. Orders assigned to this partner
| 2. Available ready_for_pickup orders which have no assignment
|--------------------------------------------------------------------------
*/
router.get("/orders/:partnerId", async (req, res) => {
  try {
    const partnerId = toNumber(req.params.partnerId);
    const status = String(req.query.status || "").trim();

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery partner ID",
      });
    }

    const values = [partnerId];
    let statusFilter = "";

    if (status) {
      values.push(status);
      statusFilter = `AND o.status = $2`;
    }

    const result = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        o.store_id,
        o.address_id,
        o.status,
        o.subtotal,
        o.delivery_fee,
        o.discount,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.notes,
        o.created_at,
        o.updated_at,

        da.id AS delivery_assignment_id,
        da.delivery_partner_id,
        da.status AS assignment_status,
        da.assigned_at,
        da.picked_up_at,
        da.delivered_at,
        da.pickup_latitude,
        da.pickup_longitude,
        da.delivery_latitude,
        da.delivery_longitude,

        s.name AS store_name,
        s.phone AS store_phone,
        s.address AS store_location

      FROM orders o

      LEFT JOIN delivery_assignments da
        ON da.order_id = o.id

      LEFT JOIN stores s
        ON s.id = o.store_id

      WHERE
        (
          da.delivery_partner_id = $1
          OR
          (
            o.status = 'ready_for_pickup'
            AND da.id IS NULL
          )
        )

        ${statusFilter}

      ORDER BY o.created_at DESC
      `,
      values
    );

    return res.json({
      success: true,
      count: result.rows.length,
      orders: result.rows,
    });
  } catch (error) {
    return sendError(res, 500, "Could not load delivery orders", error);
  }
});

/*
|--------------------------------------------------------------------------
| ORDER DETAIL
|--------------------------------------------------------------------------
*/
router.get("/order/:orderId", async (req, res) => {
  try {
    const orderId = toNumber(req.params.orderId);
    const partnerId = toNumber(req.query.partnerId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const orderResult = await pool.query(
      `
      SELECT
        o.*,

        da.id AS delivery_assignment_id,
        da.delivery_partner_id,
        da.status AS assignment_status,
        da.assigned_at,
        da.picked_up_at,
        da.delivered_at,
        da.pickup_latitude,
        da.pickup_longitude,
        da.delivery_latitude,
        da.delivery_longitude,

        s.name AS store_name,
        s.phone AS store_phone,
        s.address AS store_location,

        a.*

      FROM orders o

      LEFT JOIN delivery_assignments da
        ON da.order_id = o.id

      LEFT JOIN stores s
        ON s.id = o.store_id

      LEFT JOIN addresses a
        ON a.id = o.address_id

      WHERE o.id = $1
      `,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    if (
      partnerId &&
      order.delivery_partner_id &&
      Number(order.delivery_partner_id) !== partnerId
    ) {
      return res.status(403).json({
        success: false,
        message: "This order is assigned to another delivery partner",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT
        oi.id,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.price,
        oi.total_price
      FROM order_items oi
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
      `,
      [orderId]
    );

    const historyResult = await pool.query(
      `
      SELECT
        dsh.id,
        dsh.status,
        dsh.latitude,
        dsh.longitude,
        dsh.created_at
      FROM delivery_status_history dsh
      INNER JOIN delivery_assignments da
        ON da.id = dsh.delivery_assignment_id
      WHERE da.order_id = $1
      ORDER BY dsh.created_at ASC
      `,
      [orderId]
    );

    return res.json({
      success: true,
      order,
      items: itemsResult.rows,
      deliveryHistory: historyResult.rows,
    });
  } catch (error) {
    return sendError(res, 500, "Could not load order details", error);
  }
});

/*
|--------------------------------------------------------------------------
| ACCEPT ORDER
|--------------------------------------------------------------------------
*/
/* ----------------------------------------------------------
   GET /api/delivery/available
   Lists orders ready for pickup that no driver has accepted yet.
---------------------------------------------------------- */
router.get("/available", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.id, o.store_id, o.total_amount, o.status, o.created_at,
         a.full_address, a.latitude, a.longitude,
         s.name AS store_name, s.address AS store_address,
         s.latitude AS store_lat, s.longitude AS store_lng
       FROM orders o
       LEFT JOIN addresses a ON a.id = o.address_id
       LEFT JOIN stores s ON s.id = o.store_id
       WHERE o.status = 'ready_for_pickup'
         AND NOT EXISTS (
           SELECT 1 FROM delivery_assignments da
           WHERE da.order_id = o.id
             AND da.status NOT IN ('cancelled')
         )
       ORDER BY o.created_at ASC
       LIMIT 30`
    );
    res.json({ success: true, orders: result.rows });
  } catch (e) {
    console.error("Available orders error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});
router.post("/order/:orderId/accept", async (req, res) => {
  const client = await pool.connect();

  try {
    const orderId = toNumber(req.params.orderId);
    const partnerId = toNumber(req.body?.partnerId);

    if (!orderId || !partnerId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and partner ID are required",
      });
    }

    await client.query("BEGIN");

    const partnerCheck = await client.query(
      `
      SELECT id, is_online, is_available
      FROM delivery_partners
      WHERE id = $1
      FOR UPDATE
      `,
      [partnerId]
    );

    if (partnerCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    const orderCheck = await client.query(
      `
      SELECT id, status
      FROM orders
      WHERE id = $1
      FOR UPDATE
      `,
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderCheck.rows[0];

    if (
      order.status !== "ready_for_pickup" &&
      order.status !== "pending"
    ) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: `Order cannot be accepted from status ${order.status}`,
      });
    }

    const existingAssignment = await client.query(
      `
      SELECT *
      FROM delivery_assignments
      WHERE order_id = $1
      FOR UPDATE
      `,
      [orderId]
    );

    let assignment;

    if (existingAssignment.rows.length > 0) {
      assignment = existingAssignment.rows[0];

      if (
        assignment.delivery_partner_id &&
        Number(assignment.delivery_partner_id) !== partnerId
      ) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Order is already assigned to another delivery partner",
        });
      }

      const updated = await client.query(
        `
        UPDATE delivery_assignments
        SET
          delivery_partner_id = $1,
          status = 'accepted',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
        `,
        [partnerId, assignment.id]
      );

      assignment = updated.rows[0];
    } else {
      const inserted = await client.query(
        `
        INSERT INTO delivery_assignments
          (order_id, delivery_partner_id, status)
        VALUES
          ($1, $2, 'accepted')
        RETURNING *
        `,
        [orderId, partnerId]
      );

      assignment = inserted.rows[0];
    }

    await client.query(
      `
      UPDATE orders
      SET
        status = 'ready_for_pickup',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [orderId]
    );

    await client.query(
      `
      INSERT INTO delivery_status_history
        (delivery_assignment_id, status)
      VALUES
        ($1, 'accepted')
      `,
      [assignment.id]
    );

    await client.query("COMMIT");

    // ---- Notify customer + store that a driver accepted ----
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${orderId}`).emit('order:assigned', {
          orderId,
          deliveryPartnerId: partnerId,
          acceptedAt: new Date().toISOString(),
        });
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: "Order accepted",
      assignment,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, 500, "Could not accept order", error);
  } finally {
    client.release();
  }
});

/*
|--------------------------------------------------------------------------
| REJECT ORDER
|--------------------------------------------------------------------------
*/
router.post("/order/:orderId/reject", async (req, res) => {
  const client = await pool.connect();

  try {
    const orderId = toNumber(req.params.orderId);
    const partnerId = toNumber(req.body?.partnerId);

    if (!orderId || !partnerId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and partner ID are required",
      });
    }

    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `
      SELECT *
      FROM delivery_assignments
      WHERE order_id = $1
      FOR UPDATE
      `,
      [orderId]
    );

    if (assignmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Delivery assignment not found",
      });
    }

    const assignment = assignmentResult.rows[0];

    if (Number(assignment.delivery_partner_id) !== partnerId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "This order is not assigned to this delivery partner",
      });
    }

    await client.query(
      `
      UPDATE delivery_assignments
      SET
        status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [assignment.id]
    );

    await client.query(
      `
      UPDATE orders
      SET
        status = 'ready_for_pickup',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [orderId]
    );

    await client.query(
      `
      INSERT INTO delivery_status_history
        (delivery_assignment_id, status)
      VALUES
        ($1, 'rejected')
      `,
      [assignment.id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Order rejected",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, 500, "Could not reject order", error);
  } finally {
    client.release();
  }
});

/*
|--------------------------------------------------------------------------
| START DELIVERY
|--------------------------------------------------------------------------
| Pickup completed -> order becomes out_for_delivery.
|--------------------------------------------------------------------------
*/
router.post("/order/:orderId/start", async (req, res) => {
  const client = await pool.connect();

  try {
    const orderId = toNumber(req.params.orderId);
    const partnerId = toNumber(req.body?.partnerId);
    const latitude = req.body?.latitude ?? null;
    const longitude = req.body?.longitude ?? null;

    if (!orderId || !partnerId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and partner ID are required",
      });
    }

    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `
      SELECT *
      FROM delivery_assignments
      WHERE order_id = $1
        AND delivery_partner_id = $2
      FOR UPDATE
      `,
      [orderId, partnerId]
    );

    if (assignmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Delivery assignment not found",
      });
    }

    const assignment = assignmentResult.rows[0];

    const updated = await client.query(
      `
      UPDATE delivery_assignments
      SET
        status = 'out_for_delivery',
        picked_up_at = COALESCE(picked_up_at, CURRENT_TIMESTAMP),
        pickup_latitude = COALESCE($2, pickup_latitude),
        pickup_longitude = COALESCE($3, pickup_longitude),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [assignment.id, latitude, longitude]
    );

    await client.query(
      `
      UPDATE orders
      SET
        status = 'out_for_delivery',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [orderId]
    );

    await client.query(
      `
      INSERT INTO delivery_status_history
        (delivery_assignment_id, status, latitude, longitude)
      VALUES
        ($1, 'out_for_delivery', $2, $3)
      `,
      [assignment.id, latitude, longitude]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Delivery started",
      assignment: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, 500, "Could not start delivery", error);
  } finally {
    client.release();
  }
});

/*
|--------------------------------------------------------------------------
| COMPLETE DELIVERY
|--------------------------------------------------------------------------
*/
router.post("/order/:orderId/complete", async (req, res) => {
  const client = await pool.connect();

  try {
    const orderId = toNumber(req.params.orderId);
    const partnerId = toNumber(req.body?.partnerId);
    const latitude = req.body?.latitude ?? null;
    const longitude = req.body?.longitude ?? null;

    if (!orderId || !partnerId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and partner ID are required",
      });
    }

    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `
      SELECT *
      FROM delivery_assignments
      WHERE order_id = $1
        AND delivery_partner_id = $2
      FOR UPDATE
      `,
      [orderId, partnerId]
    );

    if (assignmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Delivery assignment not found",
      });
    }

    const assignment = assignmentResult.rows[0];

    const updated = await client.query(
      `
      UPDATE delivery_assignments
      SET
        status = 'delivered',
        delivered_at = CURRENT_TIMESTAMP,
        delivery_latitude = COALESCE($2, delivery_latitude),
        delivery_longitude = COALESCE($3, delivery_longitude),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [assignment.id, latitude, longitude]
    );

    await client.query(
      `
      UPDATE orders
      SET
        status = 'delivered',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [orderId]
    );

    await client.query(
      `
      INSERT INTO delivery_status_history
        (delivery_assignment_id, status, latitude, longitude)
      VALUES
        ($1, 'delivered', $2, $3)
      `,
      [assignment.id, latitude, longitude]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Delivery completed",
      assignment: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, 500, "Could not complete delivery", error);
  } finally {
    client.release();
  }
});

/*
|--------------------------------------------------------------------------
| EARNINGS
|--------------------------------------------------------------------------
*/
router.get("/earnings/:partnerId", async (req, res) => {
  try {
    const partnerId = toNumber(req.params.partnerId);
    const days = Math.min(
      Math.max(toNumber(req.query.days, 30), 1),
      365
    );

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery partner ID",
      });
    }

    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE da.status = 'delivered'
        )::int AS delivered_orders,

        COALESCE(
          SUM(o.delivery_fee) FILTER (
            WHERE da.status = 'delivered'
          ),
          0
        )::numeric AS total_earnings,

        COALESCE(
          SUM(o.delivery_fee) FILTER (
            WHERE da.status = 'delivered'
            AND da.delivered_at::date = CURRENT_DATE
          ),
          0
        )::numeric AS today_earnings

      FROM delivery_assignments da
      INNER JOIN orders o ON o.id = da.order_id

      WHERE da.delivery_partner_id = $1
      `,
      [partnerId]
    );

    const trendResult = await pool.query(
      `
      SELECT
        da.delivered_at::date AS date,
        COUNT(*)::int AS orders,
        COALESCE(SUM(o.delivery_fee), 0)::numeric AS earnings

      FROM delivery_assignments da

      INNER JOIN orders o
        ON o.id = da.order_id

      WHERE da.delivery_partner_id = $1
        AND da.status = 'delivered'
        AND da.delivered_at >= CURRENT_DATE - ($2::int * INTERVAL '1 day')

      GROUP BY da.delivered_at::date
      ORDER BY date ASC
      `,
      [partnerId, days]
    );

    return res.json({
      success: true,
      periodDays: days,
      summary: summaryResult.rows[0],
      trend: trendResult.rows,
    });
  } catch (error) {
    return sendError(res, 500, "Could not load earnings", error);
  }
});

/*
|--------------------------------------------------------------------------
| PROFILE
|--------------------------------------------------------------------------
*/
router.get("/profile/:partnerId", async (req, res) => {
  try {
    const partnerId = toNumber(req.params.partnerId);

    const result = await pool.query(
      `
      SELECT
        dp.id AS delivery_partner_id,
        dp.user_id,
        dp.vehicle_type,
        dp.vehicle_number,
        dp.is_online,
        dp.is_available,
        dp.current_latitude,
        dp.current_longitude,

        u.name,
        u.phone,
        u.email

      FROM delivery_partners dp

      INNER JOIN users u
        ON u.id = dp.user_id

      WHERE dp.id = $1
      `,
      [partnerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    return res.json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Could not load delivery profile", error);
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE PROFILE
|--------------------------------------------------------------------------
*/
router.put("/profile/:partnerId", async (req, res) => {
  const client = await pool.connect();

  try {
    const partnerId = toNumber(req.params.partnerId);

    const {
      name,
      email,
      vehicle_type,
      vehicle_number,
    } = req.body || {};

    await client.query("BEGIN");

    const partnerResult = await client.query(
      `
      SELECT user_id
      FROM delivery_partners
      WHERE id = $1
      FOR UPDATE
      `,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    const userId = partnerResult.rows[0].user_id;

    await client.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [name ?? null, email ?? null, userId]
    );

    await client.query(
      `
      UPDATE delivery_partners
      SET
        vehicle_type = COALESCE($1, vehicle_type),
        vehicle_number = COALESCE($2, vehicle_number),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        vehicle_type ?? null,
        vehicle_number ?? null,
        partnerId,
      ]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Profile updated",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, 500, "Could not update profile", error);
  } finally {
    client.release();
  }
});

/*
|--------------------------------------------------------------------------
| ONLINE / OFFLINE
|--------------------------------------------------------------------------
*/
router.post("/toggle-online/:partnerId", async (req, res) => {
  try {
    const partnerId = toNumber(req.params.partnerId);

    const requestedOnline =
      typeof req.body?.is_online === "boolean"
        ? req.body.is_online
        : null;

    const current = await pool.query(
      `
      SELECT id, is_online, is_available
      FROM delivery_partners
      WHERE id = $1
      `,
      [partnerId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    const newOnline =
      requestedOnline === null
        ? !current.rows[0].is_online
        : requestedOnline;

    const result = await pool.query(
      `
      UPDATE delivery_partners
      SET
        is_online = $1,
        is_available = CASE
          WHEN $1 = false THEN false
          ELSE is_available
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        is_online,
        is_available
      `,
      [newOnline, partnerId]
    );

    return res.json({
      success: true,
      message: newOnline
        ? "Delivery partner is now online"
        : "Delivery partner is now offline",
      partner: result.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Could not change online status", error);
  }
});


/* ----------------------------------------------------------
   POST /api/delivery/register
   Register a new delivery partner (pending admin approval).
---------------------------------------------------------- */
router.post('/register', async (req, res) => {
  try {
    const { idToken, name, phone, email, vehicle_type, vehicle_number, address } = req.body || {};
    const decoded = await verifyIdToken(idToken);
    const gEmail = (decoded.email || '').trim().toLowerCase();
    if (!gEmail) return res.status(400).json({ success: false, message: 'Google account has no email' });

    const exists = await pool.query(
      `SELECT id, approval_status FROM delivery_partners WHERE LOWER(COALESCE(email,'')) = $1
       OR (user_id IN (SELECT id FROM users WHERE LOWER(email) = $1)) LIMIT 1`,
      [gEmail]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({
        success: false, already_exists: true,
        partnerId: exists.rows[0].id,
        status: exists.rows[0].approval_status,
        message: 'A delivery partner with this email already exists.',
      });
    }

    // Create a users row (used as the profile holder)
    const userRes = await pool.query(
      `INSERT INTO users (name, phone, email, role, created_at)
       VALUES ($1, $2, $3, 'delivery_partner', CURRENT_TIMESTAMP)
       RETURNING id`,
      [String(name || decoded.name || 'Partner').slice(0, 120), String(phone || '').slice(0, 20), gEmail]
    );
    const userId = userRes.rows[0].id;

    const pRes = await pool.query(
      `INSERT INTO delivery_partners
         (user_id, vehicle_type, vehicle_number, is_online, is_available, approval_status, firebase_uid, created_at, updated_at)
       VALUES ($1, $2, $3, FALSE, FALSE, 'pending', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, approval_status`,
      [userId, String(vehicle_type || 'Bike').slice(0, 30), String(vehicle_number || '').slice(0, 20), decoded.uid]
    );

    return res.json({
      success: true, pending: true,
      partnerId: pRes.rows[0].id,
      message: 'Registration received. Awaiting admin approval.',
    });
  } catch (e) {
    console.error('Driver register error:', e.message);
    res.status(500).json({ success: false, message: e.message || 'Registration failed' });
  }
});

/* ----------------------------------------------------------
   POST /api/delivery/google
   Firebase ID token -> find partner by email -> approval gate -> JWT
---------------------------------------------------------- */
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const decoded = await verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'No email on Google account' });

    const r = await pool.query(
      `SELECT dp.id, dp.user_id, dp.approval_status, dp.rejection_reason,
              u.name, u.phone, u.email
       FROM delivery_partners dp
       LEFT JOIN users u ON u.id = dp.user_id
       WHERE LOWER(COALESCE(u.email,'')) = $1 LIMIT 1`,
      [email]
    );
    if (r.rows.length === 0) {
      return res.status(200).json({
        success: false, not_registered: true,
        google: { email, name: decoded.name || '', uid: decoded.uid },
        message: 'No delivery partner registered with this Google account.',
      });
    }

    const partner = r.rows[0];
    if (!partner.firebase_uid) {
      await pool.query(`UPDATE delivery_partners SET firebase_uid = $1 WHERE id = $2`, [decoded.uid, partner.id]).catch(() => {});
    }

    const _appr = (partner.approval_status || 'approved').toLowerCase();
    if (_appr === 'pending') {
      return res.status(200).json({ success: false, pending: true, partnerId: partner.id, name: partner.name, message: 'Awaiting admin approval.' });
    }
    if (_appr === 'rejected') {
      return res.status(200).json({ success: false, rejected: true, reason: partner.rejection_reason || 'Contact support.', message: 'Application rejected.' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: partner.user_id, partnerId: partner.id, role: 'delivery_partner' },
      process.env.JWT_SECRET || 'pvl-dev-secret',
      { expiresIn: '30d' }
    );

    return res.json({
      success: true, token, partnerId: partner.id,
      partner: { id: partner.id, name: partner.name, phone: partner.phone, email: partner.email },
    });
  } catch (e) {
    console.error('Driver google auth error:', e.message);
    res.status(401).json({ success: false, message: e.message || 'Google verification failed' });
  }
});

module.exports = router;
