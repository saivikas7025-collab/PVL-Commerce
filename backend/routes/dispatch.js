const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const engine = require('../services/dispatchEngine');

// ============ ORDER-LEVEL ============
router.post('/order/:orderId/dispatch', async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId)) return res.status(400).json({ success: false, message: 'Invalid orderId' });
  try {
    const result = await engine.dispatchOrder(orderId);
    return res.json({ success: true, result });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/order/:orderId', async (req, res) => {
  const orderId = Number(req.params.orderId);
  try {
    const { rows: [order] } = await pool.query(`
      SELECT o.id, o.status, o.dispatch_status, o.store_id, o.driver_id,
             o.gps_lat, o.gps_lng, o.accepted_by_store_at, o.accepted_by_driver_at,
             s.name AS store_name, s.phone AS store_phone,
             dp.vehicle_number, dp.vehicle_type
        FROM orders o
        LEFT JOIN stores s ON s.id = o.store_id
        LEFT JOIN delivery_partners dp ON dp.id = o.driver_id
       WHERE o.id=$1`, [orderId]);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });

    const { rows: storeOffers } = await pool.query(
      `SELECT id, store_id, status, score, offered_at, expires_at, responded_at, rejection_reason
         FROM store_assignments WHERE order_id=$1 ORDER BY id DESC`, [orderId]);
    const { rows: driverOffers } = await pool.query(
      `SELECT id, delivery_partner_id AS driver_id, status, score, offered_at, expires_at, responded_at, rejection_reason
         FROM delivery_assignments WHERE order_id=$1 ORDER BY id DESC`, [orderId]);

    return res.json({ success: true, order, store_offers: storeOffers, driver_offers: driverOffers });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ============ STORE SIDE ============
router.get('/store/:storeId/inbox', async (req, res) => {
  const storeId = Number(req.params.storeId);
  try {
    const { rows } = await pool.query(`
      SELECT sa.id AS assignment_id, sa.order_id, sa.status, sa.score,
             sa.offered_at, sa.expires_at,
             o.total_amount, o.gps_lat, o.gps_lng, o.dispatch_status,
             (SELECT json_agg(json_build_object('product_id', oi.product_id, 'name', oi.product_name, 'qty', oi.quantity))
                FROM order_items oi WHERE oi.order_id = sa.order_id) AS items
        FROM store_assignments sa
        JOIN orders o ON o.id = sa.order_id
       WHERE sa.store_id=$1 AND sa.status='offered'
         AND (sa.expires_at IS NULL OR sa.expires_at > now())
       ORDER BY sa.offered_at DESC`, [storeId]);
    return res.json({ success: true, offers: rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/store/:storeId/orders/:orderId/accept', async (req, res) => {
  try {
    const storeId = Number(req.params.storeId);
    const orderId = Number(req.params.orderId);
    const r = await engine.storeAccepts(orderId, storeId);
    const driver = await engine.dispatchToDriver(orderId);
    return res.json({ success: true, ...r, driver });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/store/:storeId/orders/:orderId/reject', async (req, res) => {
  try {
    const storeId = Number(req.params.storeId);
    const orderId = Number(req.params.orderId);
    const reason = (req.body && req.body.reason) || null;
    const r = await engine.storeRejects(orderId, storeId, reason);
    const next = await engine.dispatchOrder(orderId); // try next candidate
    return res.json({ success: true, ...r, next });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ============ DRIVER SIDE ============
router.get('/driver/:driverId/inbox', async (req, res) => {
  const driverId = Number(req.params.driverId);
  try {
    const { rows } = await pool.query(`
      SELECT da.id AS assignment_id, da.order_id, da.status, da.score,
             da.offered_at, da.expires_at,
             o.total_amount, o.gps_lat, o.gps_lng, o.dispatch_status,
             s.id AS store_id, s.name AS store_name, s.address AS store_address,
             s.latitude AS store_lat, s.longitude AS store_lng
        FROM delivery_assignments da
        JOIN orders o ON o.id = da.order_id
        LEFT JOIN stores s ON s.id = o.store_id
       WHERE da.delivery_partner_id=$1 AND da.status='offered'
         AND (da.expires_at IS NULL OR da.expires_at > now())
       ORDER BY da.offered_at DESC`, [driverId]);
    return res.json({ success: true, offers: rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/driver/:driverId/orders/:orderId/accept', async (req, res) => {
  try {
    const r = await engine.driverAccepts(Number(req.params.orderId), Number(req.params.driverId));
    return res.json({ success: true, ...r });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/driver/:driverId/orders/:orderId/reject', async (req, res) => {
  try {
    const reason = (req.body && req.body.reason) || null;
    const orderId = Number(req.params.orderId);
    const r = await engine.driverRejects(orderId, Number(req.params.driverId), reason);
    const next = await engine.dispatchToDriver(orderId); // try next driver
    return res.json({ success: true, ...r, next });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ============ ADMIN BOARD ============
router.get('/live', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id AS order_id, o.status, o.dispatch_status,
             o.total_amount, o.gps_lat, o.gps_lng, o.created_at,
             s.id AS store_id, s.name AS store_name,
             dp.id AS driver_id, dp.vehicle_number
        FROM orders o
        LEFT JOIN stores s ON s.id = o.store_id
        LEFT JOIN delivery_partners dp ON dp.id = o.driver_id
       WHERE o.dispatch_status IS NOT NULL
         AND o.dispatch_status <> 'unassigned'
         AND o.status NOT IN ('delivered','cancelled')
       ORDER BY o.created_at DESC LIMIT 100`);
    return res.json({ success: true, orders: rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/candidates/:orderId', async (req, res) => {
  const orderId = Number(req.params.orderId);
  try {
    const { rows: [order] } = await pool.query(`SELECT gps_lat, gps_lng FROM orders WHERE id=$1`, [orderId]);
    if (!order || !order.gps_lat || !order.gps_lng)
      return res.status(400).json({ success: false, message: 'Order has no GPS' });
    const { rows: items } = await pool.query(`SELECT product_id, quantity FROM order_items WHERE order_id=$1`, [orderId]);
    const storeSelection = await engine.selectBestStore(Number(order.gps_lat), Number(order.gps_lng), items);
    return res.json({ success: true, storeSelection });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/admin/:orderId/reassign-store', async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const newStoreId = Number(req.body && req.body.storeId);
    const actor = (req.body && req.body.actor) || 'admin';
    if (!Number.isInteger(newStoreId)) return res.status(400).json({ success: false, message: 'storeId required' });
    const r = await engine.adminReassignStore(orderId, newStoreId, actor);
    return res.json({ success: true, ...r });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/admin/:orderId/reassign-driver', async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const newDriverId = Number(req.body && req.body.driverId);
    const actor = (req.body && req.body.actor) || 'admin';
    if (!Number.isInteger(newDriverId)) return res.status(400).json({ success: false, message: 'driverId required' });
    const r = await engine.adminReassignDriver(orderId, newDriverId, actor);
    return res.json({ success: true, ...r });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ============ CONFIG ============
router.get('/config', async (req, res) => {
  try { return res.json({ success: true, config: await engine.getConfig() }); }
  catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

router.put('/config', async (req, res) => {
  const allowed = ['store_weight_availability','store_weight_distance','store_weight_prep_time',
    'store_weight_workload','store_weight_reliability','store_weight_preference',
    'driver_weight_distance','driver_weight_workload','driver_weight_pickup_time',
    'driver_weight_route','driver_weight_availability',
    'store_offer_timeout_seconds','driver_offer_timeout_seconds',
    'max_store_distance_km','max_driver_distance_km'];
  const updates = []; const values = [];
  for (const k of allowed) {
    if (req.body && req.body[k] !== undefined) { values.push(req.body[k]); updates.push(`${k} = $${values.length}`); }
  }
  if (!updates.length) return res.status(400).json({ success: false, message: 'No valid fields' });
  try {
    values.push(new Date());
    await pool.query(`UPDATE dispatch_config SET ${updates.join(', ')}, updated_at=$${values.length} WHERE id=1`, values);
    return res.json({ success: true, config: await engine.getConfig() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
