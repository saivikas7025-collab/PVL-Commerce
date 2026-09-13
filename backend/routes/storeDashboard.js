const express = require("express");
const router = express.Router();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "pvl_commerce",
});

/*
============================================================
STORE DASHBOARD API
============================================================
*/

function getStoreId(req) {
  const value = Number(req.params.storeId);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/* ----------------------------------------------------------
   LOGIN
---------------------------------------------------------- */

router.post("/login", async (req, res) => {
  const storeId = Number(req.body.storeId);
  const password = String(req.body.password || "");

  if (!Number.isInteger(storeId) || !password) {
    return res.status(400).json({
      success: false,
      message: "Store ID and password are required",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, name, password, is_active
      FROM stores
      WHERE id = $1
      `,
      [storeId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Store not found",
      });
    }

    const store = result.rows[0];

    if (store.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    return res.json({
      success: true,
      storeId: store.id,
      store: {
        id: store.id,
        name: store.name,
        is_online: store.is_active,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   DASHBOARD
---------------------------------------------------------- */

router.get("/dashboard/:storeId", async (req, res) => {
  const storeId = getStoreId(req);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const [
      totalOrders,
      todayRevenue,
      pendingProducts,
      lowStock,
      recentOrders,
      lowStockItems,
    ] = await Promise.all([
      pool.query(
        `
        SELECT COUNT(*)::int AS total_orders
        FROM orders
        WHERE store_id = $1
        `,
        [storeId]
      ),

      pool.query(
        `
        SELECT COALESCE(SUM(total_amount), 0)::numeric AS today_revenue
        FROM orders
        WHERE store_id = $1
          AND created_at::date = CURRENT_DATE
          AND status = 'delivered'
        `,
        [storeId]
      ),

      pool.query(
        `
        SELECT COUNT(*)::int AS pending_products
        FROM products
        WHERE store_id = $1
          AND approval_status = 'pending'
        `,
        [storeId]
      ),

      pool.query(
        `
        SELECT COUNT(*)::int AS low_stock
        FROM inventory
        WHERE store_id = $1
          AND stock_quantity <= 5
        `,
        [storeId]
      ),

      pool.query(
        `
        SELECT
          id,
          total_amount,
          status,
          payment_method,
          created_at
        FROM orders
        WHERE store_id = $1
        ORDER BY created_at DESC
        LIMIT 5
        `,
        [storeId]
      ),

      pool.query(
        `
        SELECT
          p.id,
          p.name,
          COALESCE(i.stock_quantity, 0)::int AS stock
        FROM inventory i
        JOIN products p ON p.id = i.product_id
        WHERE i.store_id = $1
          AND i.stock_quantity <= 5
        ORDER BY i.stock_quantity ASC
        LIMIT 5
        `,
        [storeId]
      ),
    ]);

    return res.json({
      success: true,
      total_orders: totalOrders.rows[0].total_orders,
      today_revenue: Number(todayRevenue.rows[0].today_revenue || 0),
      pending_products: pendingProducts.rows[0].pending_products,
      low_stock: lowStock.rows[0].low_stock,
      recent_orders: recentOrders.rows,
      low_stock_items: lowStockItems.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   ORDERS
---------------------------------------------------------- */

router.get("/orders/:storeId", async (req, res) => {
  const storeId = getStoreId(req);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  const status = String(req.query.status || "");

  try {
    let result;

    if (status && status !== "all") {
      result = await pool.query(
        `
        SELECT *
        FROM orders
        WHERE store_id = $1
          AND status = $2
        ORDER BY created_at DESC
        `,
        [storeId, status]
      );
    } else {
      result = await pool.query(
        `
        SELECT *
        FROM orders
        WHERE store_id = $1
        ORDER BY created_at DESC
        `,
        [storeId]
      );
    }

    return res.json({
      success: true,
      orders: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   SINGLE ORDER
---------------------------------------------------------- */

router.get("/order/:orderId", async (req, res) => {
  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  try {
    const order = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE id = $1
      `,
      [orderId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const items = await pool.query(
      `
      SELECT *
      FROM order_items
      WHERE order_id = $1
      ORDER BY id
      `,
      [orderId]
    );

    return res.json({
      success: true,
      order: order.rows[0],
      items: items.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   ORDER STATUS
---------------------------------------------------------- */

router.put("/order/:orderId/status", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const status = String(req.body.status || "");

  const allowedStatuses = [
    "pending",
    "accepted",
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  if (!Number.isInteger(orderId) || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID or status",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE orders
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await pool.query(
      `
      INSERT INTO order_status_history
        (order_id, status, created_at)
      VALUES
        ($1, $2, CURRENT_TIMESTAMP)
      `,
      [orderId, status]
    ).catch(() => {});

    // ---- Socket broadcast on status change ----
    try {
      const io = req.app.get('io');
      const updatedOrder = result.rows[0];
      if (io) {
        io.to(`order_${orderId}`).emit('order:status', updatedOrder);
        if (updatedOrder.store_id) {
          io.to(`store_${updatedOrder.store_id}`).emit('order:status', updatedOrder);
        }
        if (status === 'ready_for_pickup') {
          const detail = await pool.query(
            `SELECT o.id, o.store_id, o.total_amount, o.status, o.created_at,
                    a.full_address, a.latitude, a.longitude,
                    s.name AS store_name, s.address AS store_address,
                    s.latitude AS store_lat, s.longitude AS store_lng
             FROM orders o
             LEFT JOIN addresses a ON a.id = o.address_id
             LEFT JOIN stores s ON s.id = o.store_id
             WHERE o.id = $1`,
            [orderId]
          );
          if (detail.rows.length > 0) {
            io.to('drivers').emit('driver:request', detail.rows[0]);
          }
        }
      }
    } catch (_) {}

    return res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   PRODUCTS
---------------------------------------------------------- */

router.get("/products/:storeId", async (req, res) => {
  const storeId = getStoreId(req);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.store_id,
        p.category_id,
        p.subcategory_id,
        p.name,
        p.description,
        p.unit,
        p.price,
        p.original_price,
        p.image_url,
        p.is_active,
        p.approval_status,
        p.store_notes,
        c.name AS category_name,
        pc.name AS main_category,
        ps.name AS subcategory,
        COALESCE(i.stock_quantity, 0)::int AS stock_quantity,
        COALESCE(i.selling_price, p.price)::numeric AS store_selling_price,
        COALESCE(i.is_available, false) AS is_available
      FROM products p
      LEFT JOIN categories c
        ON c.id = p.category_id
      LEFT JOIN product_subcategories ps
        ON ps.id = p.subcategory_id
      LEFT JOIN product_categories pc
        ON pc.id = ps.category_id
      LEFT JOIN inventory i
        ON i.product_id = p.id
       AND i.store_id = $1
      WHERE p.store_id = $1
         OR (
           p.store_id IS NULL
           AND EXISTS (
             SELECT 1
             FROM inventory ix
             WHERE ix.product_id = p.id
               AND ix.store_id = $1
           )
         )
      ORDER BY p.id DESC
      `,
      [storeId]
    );

    return res.json({
      success: true,
      products: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   ADD PRODUCT
---------------------------------------------------------- */

router.post("/product", async (req, res) => {
  const {
    storeId,
    categoryId,
    subcategoryId,
    name,
    description,
    unit,
    price,
    originalPrice,
    imageUrl,
  } = req.body;

  if (
    !storeId ||
    !categoryId ||
    !subcategoryId ||
    !name ||
    price === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required product fields",
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO products
      (
        store_id,
        category_id,
        subcategory_id,
        name,
        description,
        unit,
        price,
        original_price,
        image_url,
        is_active,
        approval_status
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'pending')
      RETURNING *
      `,
      [
        Number(storeId),
        Number(categoryId),
        Number(subcategoryId),
        String(name).trim(),
        description || null,
        unit || null,
        Number(price),
        Number(originalPrice || 0),
        imageUrl || null,
      ]
    );

    await pool.query(
      `
      INSERT INTO inventory
      (
        store_id,
        product_id,
        stock_quantity,
        is_available
      )
      VALUES
      ($1,$2,0,false)
      ON CONFLICT DO NOTHING
      `,
      [Number(storeId), result.rows[0].id]
    );

    return res.status(201).json({
      success: true,
      productId: result.rows[0].id,
      product: result.rows[0],
      message: "Product added and submitted for approval",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   EDIT PRODUCT
---------------------------------------------------------- */

router.put("/product/:productId", async (req, res) => {
  const productId = Number(req.params.productId);

  const {
    categoryId,
    subcategoryId,
    name,
    description,
    unit,
    price,
    originalPrice,
    imageUrl,
  } = req.body;

  if (!Number.isInteger(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET
        category_id = $1,
        subcategory_id = $2,
        name = $3,
        description = $4,
        unit = $5,
        price = $6,
        original_price = $7,
        image_url = $8,
        approval_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
      `,
      [
        categoryId,
        subcategoryId,
        name,
        description || null,
        unit || null,
        price,
        originalPrice || 0,
        imageUrl || null,
        productId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      product: result.rows[0],
      message: "Product updated and submitted for approval",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   DELETE PRODUCT
---------------------------------------------------------- */

router.delete("/product/:productId", async (req, res) => {
  const productId = Number(req.params.productId);

  if (!Number.isInteger(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product deactivated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   INVENTORY
---------------------------------------------------------- */

router.get("/inventory/:storeId", async (req, res) => {
  const storeId = getStoreId(req);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        i.*,
        p.name AS product_name,
        c.name AS category_name,
        p.unit,
        p.price
      FROM inventory i
      JOIN products p
        ON p.id = i.product_id
      LEFT JOIN categories c
        ON c.id = p.category_id
      WHERE i.store_id = $1
      ORDER BY p.name ASC
      `,
      [storeId]
    );

    return res.json({
      success: true,
      inventory: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   UPDATE INVENTORY
---------------------------------------------------------- */

router.put("/inventory/update", async (req, res) => {
  const storeId = Number(req.body.storeId);
  const productId = Number(req.body.productId);
  const stock = Number(req.body.stock);

  if (
    !Number.isInteger(storeId) ||
    !Number.isInteger(productId) ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid inventory values",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE inventory
      SET
        stock_quantity = $1,
        is_available = ($1 > 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE store_id = $2
        AND product_id = $3
      RETURNING *
      `,
      [stock, storeId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    return res.json({
      success: true,
      inventory: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   PROFILE
---------------------------------------------------------- */


/* ----------------------------------------------------------
   POST /api/store/location/:storeId
   Save store GPS coordinates + reverse-geocoded address.
---------------------------------------------------------- */
router.post("/location/:storeId", async (req, res) => {
  const storeId = toNumber(req.params.storeId);
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const address = req.body?.address ? String(req.body.address).slice(0, 500) : null;

  if (!storeId) {
    return res.status(400).json({ success: false, message: "Invalid storeId" });
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ success: false, message: "Invalid coordinates" });
  }

  try {
    const result = await pool.query(
      `UPDATE stores
         SET latitude = $1,
             longitude = $2,
             address = COALESCE($3, address),
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, latitude, longitude, address`,
      [latitude, longitude, address, storeId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }
    return res.json({ success: true, store: result.rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});
router.get("/profile/:storeId", async (req, res) => {
  const storeId = getStoreId(req);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        phone,
        address,
        location,
        delivery_fee,
        min_order,
        is_active,
        is_active AS is_online
      FROM stores
      WHERE id = $1
      `,
      [storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.put("/profile/:storeId", async (req, res) => {
  const storeId = getStoreId(req);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  const {
    name,
    phone,
    address,
    delivery_fee,
    min_order,
  } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE stores
      SET
        name = $1,
        phone = $2,
        address = $3,
        delivery_fee = $4,
        min_order = $5
      WHERE id = $6
      RETURNING
        id,
        name,
        phone,
        address,
        location,
        delivery_fee,
        min_order,
        is_active,
        is_active AS is_online
      `,
      [
        name,
        phone,
        address,
        Number(delivery_fee || 0),
        Number(min_order || 0),
        storeId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return res.json({
      success: true,
      store: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   ONLINE / OFFLINE
---------------------------------------------------------- */

router.post("/toggle-online/:storeId", async (req, res) => {
  const storeId = getStoreId(req);
  const online = Boolean(req.body.online);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE stores
      SET is_active = $1
      WHERE id = $2
      RETURNING id, is_active
      `,
      [online, storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return res.json({
      success: true,
      online: result.rows[0].is_active,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
   REVENUE
---------------------------------------------------------- */

router.get("/revenue/:storeId", async (req, res) => {
  const storeId = getStoreId(req);
  const period = String(req.query.period || "daily");

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  let days = 1;

  if (period === "weekly") {
    days = 7;
  } else if (period === "monthly") {
    days = 30;
  }

  try {
    const result = await pool.query(
      `
      SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(total_amount), 0)::numeric AS revenue
      FROM orders
      WHERE store_id = $1
        AND status = 'delivered'
        AND created_at >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      [storeId, days]
    );

    return res.json({
      success: true,
      period,
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


/* ----------------------------------------------------------
   POST /api/store/google
   Firebase ID token → find or refuse store by email.
---------------------------------------------------------- */
const { verifyIdToken } = require('../services/firebaseAuth');

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const decoded = await verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Google account has no email" });
    }

    const result = await pool.query(
      `SELECT id, name, email, phone, address, latitude, longitude,
              approval_status, rejection_reason, is_active
       FROM stores WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      // Not registered — tell the app to show the register screen.
      return res.status(200).json({
        success: false,
        not_registered: true,
        google: {
          email,
          name: decoded.name || '',
          picture: decoded.picture || '',
          uid: decoded.uid,
        },
        message: 'No store registered with this Google account.',
      });
    }

    const store = result.rows[0];

    // Bind firebase_uid on first Google login
    if (!store.firebase_uid) {
      await pool.query(
        `UPDATE stores SET firebase_uid = $1 WHERE id = $2`,
        [decoded.uid, store.id]
      ).catch(() => {});
    }

    const status = (store.approval_status || 'approved').toLowerCase();
    if (status === 'pending') {
      return res.status(200).json({
        success: false,
        pending: true,
        storeId: store.id,
        storeName: store.name,
        message: 'Your store is awaiting admin approval.',
      });
    }
    if (status === 'rejected') {
      return res.status(200).json({
        success: false,
        rejected: true,
        reason: store.rejection_reason || 'Contact support.',
        message: 'Your store application was rejected.',
      });
    }

    // Approved → issue our token
    const jwt = require('jsonwebtoken');
    // --- Approval gate ---
    const status = (store.approval_status || 'approved').toLowerCase();
    if (status === 'pending') {
      return res.status(200).json({ success: false, pending: true, message: 'Store awaiting admin approval.' });
    }
    if (status === 'rejected') {
      return res.status(200).json({ success: false, rejected: true, message: store.rejection_reason || 'Store application rejected.' });
    }
    const token = jwt.sign(
      { storeId: store.id, email: store.email, role: 'store' },
      process.env.JWT_SECRET || 'pvl-dev-secret',
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      storeId: store.id,
      store: {
        id: store.id,
        name: store.name,
        email: store.email,
        phone: store.phone,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
      },
    });
  } catch (e) {
    console.error('Store google auth error:', e.message);
    return res.status(401).json({ success: false, message: e.message || 'Google verification failed' });
  }
});

/* ----------------------------------------------------------
   POST /api/store/register
   Creates a store with approval_status = 'pending'.
---------------------------------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const { idToken, name, phone, address, latitude, longitude } = req.body || {};
    const decoded = await verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Google account has no email" });
    }

    // Already registered?
    const exists = await pool.query(
      `SELECT id, approval_status FROM stores WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        already_exists: true,
        storeId: exists.rows[0].id,
        status: exists.rows[0].approval_status,
        message: 'A store with this email already exists.',
      });
    }

    const result = await pool.query(
      `INSERT INTO stores
         (name, email, phone, address, latitude, longitude,
          is_active, is_online, approval_status, firebase_uid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6,
               TRUE, FALSE, 'pending', $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, email, approval_status`,
      [
        String(name || decoded.name || 'New Store').slice(0, 200),
        email,
        String(phone || '').slice(0, 20),
        address ? String(address).slice(0, 500) : null,
        Number.isFinite(Number(latitude)) ? Number(latitude) : null,
        Number.isFinite(Number(longitude)) ? Number(longitude) : null,
        decoded.uid,
      ]
    );

    return res.json({
      success: true,
      pending: true,
      storeId: result.rows[0].id,
      store: result.rows[0],
      message: 'Store created. Awaiting admin approval.',
    });
  } catch (e) {
    console.error('Store register error:', e.message);
    return res.status(500).json({ success: false, message: e.message || 'Registration failed' });
  }
});

module.exports = router;