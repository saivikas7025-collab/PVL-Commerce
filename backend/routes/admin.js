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
    const search = String(req.query.q || '').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`o.status = $${params.length}`); }
    if (storeId > 0) { params.push(storeId); conditions.push(`o.store_id = $${params.length}`); }
    if (dateFrom) { params.push(dateFrom); conditions.push(`o.created_at >= $${params.length}`); }
    if (dateTo) { params.push(dateTo); conditions.push(`o.created_at <= $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        CAST(o.id AS TEXT) ILIKE $${params.length} OR
        a.full_address ILIKE $${params.length} OR
        s.name ILIKE $${params.length} OR
        (SELECT name FROM delivery_partners WHERE id = o.driver_id LIMIT 1) ILIKE $${params.length}
      )`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT o.id, o.user_id, o.store_id, o.status, o.subtotal, o.delivery_fee,
              o.discount, o.total_amount, o.payment_method, o.payment_status,
              o.notes, o.created_at, o.updated_at,
              o.gps_distance_meters, o.cod_allowed,
              o.driver_id,
              (SELECT name  FROM delivery_partners WHERE id = o.driver_id LIMIT 1) AS driver_name,
              (SELECT phone FROM delivery_partners WHERE id = o.driver_id LIMIT 1) AS driver_phone,
              s.name AS store_name,
              s.latitude AS store_lat, s.longitude AS store_lng, s.address AS store_address,
              a.full_address AS address, a.city, a.state, a.pincode,
              a.latitude AS customer_lat, a.longitude AS customer_lng,
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
      `SELECT o.*,
              s.name AS store_name, s.address AS store_address,
              s.latitude AS store_lat, s.longitude AS store_lng,
              a.full_address, a.city, a.state, a.pincode,
              a.latitude AS customer_lat, a.longitude AS customer_lng,
              (SELECT name  FROM delivery_partners WHERE id = o.driver_id LIMIT 1) AS driver_name,
              (SELECT phone FROM delivery_partners WHERE id = o.driver_id LIMIT 1) AS driver_phone
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


/* ----------------------------------------------------------
   ADMIN — Delivery partners
---------------------------------------------------------- */
router.get("/drivers", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, is_online, is_available, created_at
       FROM delivery_partners
       ORDER BY is_online DESC, name ASC
       LIMIT 500`
    );
    res.json({ success: true, drivers: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


/* ----------------------------------------------------------
   ADMIN — Customers
---------------------------------------------------------- */
router.get("/customers", async (req, res) => {
  try {
    const search = String(req.query.q || '').trim();
    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`;
    }
    const result = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.is_blocked, u.created_at,
              (SELECT COUNT(*)::int FROM orders WHERE user_id = u.id) AS total_orders,
              (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = u.id AND status = 'delivered') AS total_spend
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT 300`,
      params
    );
    res.json({ success: true, customers: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/customers/:id/block", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    const block = req.body?.block !== false;
    await pool.query(`UPDATE users SET is_blocked = $1 WHERE id = $2`, [block, id]);
    res.json({ success: true, blocked: block });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

/* ----------------------------------------------------------
   ADMIN — Order actions
---------------------------------------------------------- */
router.post("/orders/:orderId/cancel", async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId)) return res.status(400).json({ success: false, message: 'Invalid orderId' });
  const reason = req.body?.reason ? String(req.body.reason).slice(0, 500) : 'Cancelled by admin';
  try {
    const result = await pool.query(
      `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status NOT IN ('delivered', 'cancelled')
       RETURNING id, status, store_id, user_id`,
      [orderId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found or already closed' });
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, note, created_at)
       VALUES ($1, 'cancelled', $2, CURRENT_TIMESTAMP)`,
      [orderId, reason]
    ).catch(() => {});
    const io = req.app.get('io');
    if (io) {
      const o = result.rows[0];
      io.to(`order_${orderId}`).emit('order:status', o);
      if (o.store_id) io.to(`store_${o.store_id}`).emit('order:status', o);
    }
    res.json({ success: true, order: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/orders/:orderId/reassign-driver", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const driverId = Number(req.body?.driverId);
  if (!Number.isInteger(orderId) || !Number.isInteger(driverId) || driverId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid orderId or driverId' });
  }
  try {
    const r = await pool.query(
      `UPDATE orders SET driver_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
       RETURNING id, driver_id, store_id`,
      [driverId, orderId]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    const d = await pool.query(`SELECT name, phone FROM delivery_partners WHERE id = $1`, [driverId]);
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('order:assigned', {
        orderId, deliveryPartnerId: driverId,
        driver: d.rows[0] || null,
        acceptedAt: new Date().toISOString(),
      });
    }
    res.json({ success: true, order: r.rows[0], driver: d.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

/* ----------------------------------------------------------
   ADMIN — Drivers
---------------------------------------------------------- */
router.get("/drivers/pending", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, phone, is_online, approval_status, created_at
       FROM delivery_partners WHERE approval_status = 'pending' ORDER BY created_at ASC`
    );
    res.json({ success: true, drivers: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/drivers/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    await pool.query(
      `UPDATE delivery_partners SET approval_status = 'approved', rejection_reason = NULL WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/drivers/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  const reason = req.body?.reason ? String(req.body.reason).slice(0, 500) : 'Rejected by admin';
  try {
    await pool.query(
      `UPDATE delivery_partners SET approval_status = 'rejected', rejection_reason = $2 WHERE id = $1`,
      [id, reason]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

/* ----------------------------------------------------------
   ADMIN — CSV export
---------------------------------------------------------- */
router.get("/orders/export.csv", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.id, o.status, o.total_amount, o.payment_method, o.payment_status,
              o.created_at, s.name AS store_name,
              (SELECT name FROM delivery_partners WHERE id = o.driver_id LIMIT 1) AS driver_name
       FROM orders o
       LEFT JOIN stores s ON s.id = o.store_id
       ORDER BY o.created_at DESC LIMIT 5000`
    );
    const header = 'Order ID,Status,Total,Payment Method,Payment Status,Store,Driver,Created\n';
    const rows = r.rows.map(row => [
      `PVL${row.id}`,
      row.status || '',
      row.total_amount || 0,
      row.payment_method || '',
      row.payment_status || '',
      `"${(row.store_name || '').replace(/"/g, '""')}"`,
      `"${(row.driver_name || '').replace(/"/g, '""')}"`,
      row.created_at ? new Date(row.created_at).toISOString() : '',
    ].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pvl_orders.csv"');
    res.send(header + rows);
  } catch (e) { res.status(500).send('Error: ' + e.message); }
});

module.exports = router;
