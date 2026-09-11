const express = require("express");
const router = express.Router();

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "pvl_commerce",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

/*
========================================================
PVL-COMMERCE STORE DASHBOARD API
========================================================

Current Store:
ID: 1

Connected to the existing PVL-Commerce database.

Features:
- Store test
- Dashboard statistics
- Store orders
- Single order details
- Order status updates
- Products
- Inventory
- Store information
========================================================
*/


// ======================================================
// STORE TEST
// GET /api/store/test
// ======================================================

router.get("/test", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name
      FROM stores
      WHERE id = 1
      LIMIT 1
      `
    );

    res.json({
      success: true,
      message: "Store API is working",
      store: result.rows[0] || null,
    });
  } catch (error) {
    console.error("STORE TEST ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Store API error",
      error: error.message,
    });
  }
});


// ======================================================
// STORE DASHBOARD
// GET /api/store/dashboard/1
// ======================================================

router.get("/dashboard/:storeId", async (req, res) => {
  const storeId = Number(req.params.storeId);

  if (!Number.isInteger(storeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const ordersResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_orders,

        COUNT(*) FILTER (
          WHERE status IN (
            'pending',
            'accepted',
            'preparing'
          )
        )::int AS active_orders,

        COUNT(*) FILTER (
          WHERE status = 'ready_for_pickup'
        )::int AS ready_orders,

        COUNT(*) FILTER (
          WHERE status = 'delivered'
        )::int AS completed_orders,

        COALESCE(
          SUM(total_amount) FILTER (
            WHERE status = 'delivered'
          ),
          0
        )::numeric AS total_sales

      FROM orders

      WHERE store_id = $1
      `,
      [storeId]
    );

    const productsResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_products
      FROM products
      WHERE is_active = true
      `
    );

    const inventoryResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS low_stock_products
      FROM inventory
      WHERE store_id = $1
        AND stock_quantity <= 5
        AND is_available = true
      `,
      [storeId]
    );

    res.json({
      success: true,
      dashboard: {
        ...ordersResult.rows[0],
        ...productsResult.rows[0],
        ...inventoryResult.rows[0],
      },
    });
  } catch (error) {
    console.error("STORE DASHBOARD ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load store dashboard",
      error: error.message,
    });
  }
});


// ======================================================
// STORE ORDERS
// GET /api/store/orders/1
// ======================================================

router.get("/orders/:storeId", async (req, res) => {
  const storeId = Number(req.params.storeId);

  if (!Number.isInteger(storeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        o.store_id,
        o.address_id,
        o.subtotal,
        o.delivery_fee,
        o.discount,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        o.notes,
        o.created_at,
        o.updated_at,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'price', oi.price,
                'total_price', oi.total_price
              )
              ORDER BY oi.id
            )
            FROM order_items oi
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items

      FROM orders o

      WHERE o.store_id = $1

      ORDER BY o.created_at DESC
      `,
      [storeId]
    );

    res.json({
      success: true,
      orders: result.rows,
    });
  } catch (error) {
    console.error("STORE ORDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load store orders",
      error: error.message,
    });
  }
});


// ======================================================
// SINGLE ORDER
// GET /api/store/order/7
// ======================================================

router.get("/order/:orderId", async (req, res) => {
  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        o.store_id,
        o.address_id,
        o.subtotal,
        o.delivery_fee,
        o.discount,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        o.notes,
        o.created_at,
        o.updated_at,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'price', oi.price,
                'total_price', oi.total_price
              )
              ORDER BY oi.id
            )
            FROM order_items oi
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items

      FROM orders o

      WHERE o.id = $1

      LIMIT 1
      `,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error("STORE ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load order",
      error: error.message,
    });
  }
});


// ======================================================
// UPDATE ORDER STATUS
// PUT /api/store/order/7/status
// ======================================================

router.put("/order/:orderId/status", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const { status } = req.body;

  const allowedStatuses = [
    "pending",
    "accepted",
    "preparing",
    "ready_for_pickup",
    "picked_up",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status",
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

      RETURNING
        id,
        store_id,
        status,
        payment_status,
        total_amount,
        created_at,
        updated_at
      `,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      message: "Order status updated",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE STORE ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update order status",
      error: error.message,
    });
  }
});


// ======================================================
// STORE PRODUCTS
// GET /api/store/products/1
// ======================================================

router.get("/products/:storeId", async (req, res) => {
  const storeId = Number(req.params.storeId);

  if (!Number.isInteger(storeId)) {
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
        p.category_id,
        p.name,
        p.description,
        p.unit,
        p.price,
        p.original_price,
        p.image_url,
        p.is_active,

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
  const storeId = Number(req.params.storeId);

  if (!Number.isInteger(storeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const result = await pool.query(
      

      WHERE p.is_active = true

      ORDER BY p.id ASC
      `,
      [storeId]
    );

    res.json({
      success: true,
      products: result.rows,
    });
  } catch (error) {
    console.error("STORE PRODUCTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load store products",
      error: error.message,
    });
  }
});


// ======================================================
// UPDATE INVENTORY
// PUT /api/store/inventory
// ======================================================

router.put("/inventory", async (req, res) => {
  const {
    store_id,
    product_id,
    quantity,
  } = req.body;

  const storeId = Number(store_id);
  const productId = Number(product_id);
  const stockQuantity = Number(quantity);

  if (
    !Number.isInteger(storeId) ||
    !Number.isInteger(productId) ||
    !Number.isInteger(stockQuantity) ||
    stockQuantity < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid inventory data",
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO inventory (
        store_id,
        product_id,
        stock_quantity,
        selling_price,
        is_available,
        updated_at
      )

      VALUES (
        $1,
        $2,
        $3,
        (
          SELECT price
          FROM products
          WHERE id = $2
        ),
        $3 > 0,
        CURRENT_TIMESTAMP
      )

      ON CONFLICT (store_id, product_id)

      DO UPDATE SET
        stock_quantity = EXCLUDED.stock_quantity,
        is_available = EXCLUDED.is_available,
        updated_at = CURRENT_TIMESTAMP

      RETURNING *
      `,
      [
        storeId,
        productId,
        stockQuantity,
      ]
    );

    res.json({
      success: true,
      message: "Inventory updated",
      inventory: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE INVENTORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update inventory",
      error: error.message,
    });
  }
});


// ======================================================
// STORE INFORMATION
// GET /api/store/info/1
// ======================================================

router.get("/info/:storeId", async (req, res) => {
  const storeId = Number(req.params.storeId);

  if (!Number.isInteger(storeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM stores
      WHERE id = $1
      LIMIT 1
      `,
      [storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.json({
      success: true,
      store: result.rows[0],
    });
  } catch (error) {
    console.error("STORE INFO ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load store information",
      error: error.message,
    });
  }
});


module.exports = router;
