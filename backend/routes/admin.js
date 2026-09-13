const express = require('express');
const router = express.Router();
const { pool } = require('../db');

async function tableExists(name) {
  const r = await pool.query(
    `SELECT EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    ) AS exists`,
    [name]
  );

  return r.rows[0].exists;
}

async function safeRows(table, limit = 200) {
  if (!(await tableExists(table))) return [];

  const r = await pool.query(
    `SELECT * FROM "${table}" ORDER BY 1 DESC LIMIT $1`,
    [limit]
  );

  return r.rows;
}

/* ---------------- HEALTH ---------------- */

router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      ok: true,
      database: true
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      database: false,
      error: e.message
    });
  }
});

/* ---------------- DASHBOARD ---------------- */

router.get('/dashboard', async (_req, res) => {
  try {
    const orders = await pool.query(`
      SELECT
        COUNT(*)::int AS n,
        COALESCE(
          SUM(total_amount)
          FILTER (WHERE created_at::date = CURRENT_DATE),
          0
        )::numeric AS today_sales
      FROM orders
    `);

    let customers = 0;

    if (await tableExists('customers')) {
      const result = await pool.query(
        'SELECT COUNT(*)::int AS n FROM customers'
      );
      customers = result.rows[0].n;
    } else if (await tableExists('users')) {
      const result = await pool.query(
        'SELECT COUNT(*)::int AS n FROM users'
      );
      customers = result.rows[0]?.n || 0;
    }

    let activeDeliveries = 0;

    if (await tableExists('delivery_assignments')) {
      const result = await pool.query(`
        SELECT COUNT(*)::int AS n
        FROM delivery_assignments
        WHERE status IN (
          'assigned',
          'accepted',
          'picked_up',
          'out_for_delivery'
        )
      `);

      activeDeliveries = result.rows[0].n;
    }

    const recent = await pool.query(`
      SELECT
        id,
        status,
        total_amount,
        payment_status,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      total_orders: orders.rows[0].n,
      today_sales: orders.rows[0].today_sales,
      customers,
      active_deliveries: activeDeliveries,
      recent_orders: recent.rows
    });

  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

/* ---------------- LIST ROUTES ---------------- */

const routeTables = {
  orders: 'orders',
  stores: 'stores',
  delivery: 'delivery_partners',
  customers: 'customers',
  products: 'products',
  inventory: 'inventory',
  payments: 'payments'
};

for (const [route, table] of Object.entries(routeTables)) {

  router.get('/' + route, async (_req, res) => {

    try {

      res.json({
        rows: await safeRows(table)
      });

    } catch (e) {

      res.status(500).json({
        error: e.message
      });

    }

  });

}

/* ---------------- REPORTS ---------------- */

router.get('/reports', async (_req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM(total_amount), 0)::numeric AS sales,
        COALESCE(AVG(total_amount), 0)::numeric AS aov
      FROM orders
      WHERE created_at::date = CURRENT_DATE
    `);

    const o = result.rows[0];

    res.json({
      rows: [
        {
          metric: "Today's orders",
          value: o.orders
        },
        {
          metric: "Today's sales",
          value: o.sales
        },
        {
          metric: "Today's average order value",
          value: o.aov
        }
      ]
    });

  } catch (e) {

    res.status(500).json({
      error: e.message
    });

  }

});

/* ---------------- SETTINGS ---------------- */

router.get('/settings', async (_req, res) => {

  res.json({
    rows: [
      {
        setting: 'Delivery radius',
        value: process.env.DELIVERY_RADIUS_KM || '5 km'
      },
      {
        setting: 'Minimum order',
        value: process.env.MIN_ORDER || '0'
      },
      {
        setting: 'Default delivery fee',
        value: process.env.DEFAULT_DELIVERY_FEE || '25'
      },
      {
        setting: 'Payment provider',
        value: process.env.PAYMENT_PROVIDER || 'Not configured'
      }
    ]
  });

});


/* ----------------------------------------------------------
   ADMIN — Store approvals
---------------------------------------------------------- */
router.get("/stores/pending", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, address, latitude, longitude,
              approval_status, created_at
       FROM stores
       WHERE approval_status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json({ success: true, stores: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/stores/all", async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE approval_status = $1`;
    }
    const result = await pool.query(
      `SELECT id, name, email, phone, address, latitude, longitude,
              approval_status, rejection_reason, is_active, is_online, created_at
       FROM stores ${where}
       ORDER BY created_at DESC LIMIT 200`,
      params
    );
    res.json({ success: true, stores: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/stores/:id/approve", async (req, res) => {
  const storeId = Number(req.params.id);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid storeId' });
  }
  try {
    const result = await pool.query(
      `UPDATE stores
         SET approval_status = 'approved',
             rejection_reason = NULL,
             approved_at = CURRENT_TIMESTAMP,
             approved_by = $2,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, approval_status, approved_at`,
      [storeId, String(req.body?.approvedBy || 'admin').slice(0, 120)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    res.json({ success: true, store: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/stores/:id/reject", async (req, res) => {
  const storeId = Number(req.params.id);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid storeId' });
  }
  const reason = req.body?.reason ? String(req.body.reason).slice(0, 500) : 'Rejected by admin';
  try {
    const result = await pool.query(
      `UPDATE stores
         SET approval_status = 'rejected',
             rejection_reason = $2,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, approval_status, rejection_reason`,
      [storeId, reason]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    res.json({ success: true, store: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ----------------------------------------------------------
   ADMIN — All orders across all stores
---------------------------------------------------------- */
router.get("/orders", async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const storeId = Number(req.query.storeId || 0);
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`o.status = $${params.length}`); }
    if (storeId > 0) { params.push(storeId); conditions.push(`o.store_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT o.id, o.user_id, o.store_id, o.status, o.subtotal, o.delivery_fee,
              o.discount, o.total_amount, o.payment_method, o.payment_status,
              o.notes, o.created_at, o.updated_at,
              o.gps_distance_meters, o.cod_allowed,
              s.name AS store_name,
              a.full_address AS address, a.city, a.state, a.pincode,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'id', oi.id, 'product_name', oi.product_name,
                  'quantity', oi.quantity, 'price', oi.price, 'total_price', oi.total_price
                ) ORDER BY oi.id)
                FROM order_items oi WHERE oi.order_id = o.id
              ), '[]'::json) AS items
       FROM orders o
       LEFT JOIN stores s ON s.id = o.store_id
       LEFT JOIN addresses a ON a.id = o.address_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ success: true, orders: result.rows, count: result.rows.length });
  } catch (e) {
    console.error('Admin list orders error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/orders/:orderId", async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid orderId' });
  }
  try {
    const order = await pool.query(
      `SELECT o.*, s.name AS store_name, s.address AS store_address,
              a.full_address, a.city, a.state, a.pincode, a.latitude, a.longitude
       FROM orders o
       LEFT JOIN stores s ON s.id = o.store_id
       LEFT JOIN addresses a ON a.id = o.address_id
       WHERE o.id = $1`,
      [orderId]
    );
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const items = await pool.query(
      `SELECT id, product_id, product_name, quantity, price, total_price
       FROM order_items WHERE order_id = $1 ORDER BY id`,
      [orderId]
    );
    const history = await pool.query(
      `SELECT status, note, created_at FROM order_status_history
       WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderId]
    ).catch(() => ({ rows: [] }));

    res.json({
      success: true,
      order: { ...order.rows[0], status_history: history.rows },
      items: items.rows,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.patch("/orders/:orderId/status", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const status = String(req.body?.status || '').trim();
  const allowed = ['pending','accepted','preparing','ready_for_pickup','assigned','picked_up','out_for_delivery','delivered','cancelled'];
  if (!Number.isInteger(orderId) || !allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid orderId or status' });
  }
  try {
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, status, store_id, user_id`,
      [status, orderId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [orderId, status]
    ).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      const updated = result.rows[0];
      io.to(`order_${orderId}`).emit('order:status', updated);
      if (updated.store_id) io.to(`store_${updated.store_id}`).emit('order:status', updated);
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
