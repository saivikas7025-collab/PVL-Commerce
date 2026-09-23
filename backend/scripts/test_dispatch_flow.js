require('dotenv').config({ quiet: true });
const { pool } = require('../db');
const engine = require('../services/dispatchEngine');

(async () => {
  try {
    // Find or create test order
    let { rows: [order] } = await pool.query(`
      SELECT id FROM orders WHERE status NOT IN ('delivered','cancelled') ORDER BY id DESC LIMIT 1`);

    if (!order) {
      const { rows: [u] } = await pool.query(`SELECT id FROM users LIMIT 1`);
      if (!u) { console.log('No users.'); return; }
      const ins = await pool.query(`
        INSERT INTO orders (user_id, status, subtotal, delivery_fee, total_amount, payment_method, payment_status)
        VALUES ($1, 'pending', 100, 20, 120, 'cod', 'pending') RETURNING id`, [u.id]);
      order = ins.rows[0];
    }

    // Force coords + item
    await pool.query(`UPDATE orders SET gps_lat=17.4483, gps_lng=78.3915 WHERE id=$1`, [order.id]);
    const { rowCount } = await pool.query(`SELECT 1 FROM order_items WHERE order_id=$1 LIMIT 1`, [order.id]);
    if (rowCount === 0) {
      const { rows: [p] } = await pool.query(`SELECT id, name, price FROM products LIMIT 1`);
      await pool.query(`INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total_price)
                        VALUES ($1,$2,$3,1,$4,$4)`, [order.id, p.id, p.name, p.price || 100]);
    }

    console.log('=== Dispatch order', order.id, '===');
    const r = await engine.dispatchOrder(order.id);
    console.log('  ok:', r.ok, '| stage:', r.stage, '| store:', r.storeId, '| score:', r.score);

    console.log('\n=== Store accepts ===');
    await engine.storeAccepts(order.id, r.storeId);
    const dr = await engine.dispatchToDriver(order.id);
    console.log('  driver stage:', dr.stage, '| driverId:', dr.driverId, '| score:', dr.score);

    console.log('\n=== Driver accepts ===');
    if (dr.ok) await engine.driverAccepts(order.id, dr.driverId);

    const { rows: [fo] } = await pool.query(
      `SELECT id, store_id, driver_id, dispatch_status FROM orders WHERE id=$1`, [order.id]);
    console.log('  final order:', fo);

    console.log('\n=== Store offer history ===');
    const { rows: sa } = await pool.query(
      `SELECT store_id, status, score FROM store_assignments WHERE order_id=$1`, [order.id]);
    console.log('  ', sa);

    console.log('\n=== Driver offer history ===');
    const { rows: da } = await pool.query(
      `SELECT delivery_partner_id AS driver, status, score FROM delivery_assignments WHERE order_id=$1 AND offered_at IS NOT NULL`, [order.id]);
    console.log('  ', da);

    console.log('\n=== Inventory reservation (product 1 at store 1) ===');
    const { rows: inv } = await pool.query(
      `SELECT stock_quantity, reserved_quantity FROM inventory WHERE store_id=$1 AND product_id=$2`, [r.storeId, 1]);
    console.log('  ', inv);

    console.log('\n=== DONE ===');
  } catch (e) { console.error('ERROR:', e.message); console.error(e.stack); process.exitCode = 1; }
  finally { await pool.end(); }
})();
