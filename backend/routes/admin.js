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

module.exports = router;
