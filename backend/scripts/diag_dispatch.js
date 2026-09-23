require('dotenv').config({ quiet: true });
const { pool } = require('../db');
const engine = require('../services/dispatchEngine');

(async () => {
  try {
    // Grab an existing user + address
    const { rows: [u] } = await pool.query(`SELECT id FROM users LIMIT 1`);
    if (!u) { console.log('No users'); return; }

    const { rows: [addr] } = await pool.query(`SELECT id FROM addresses LIMIT 1`);
    if (!addr) { console.log('No addresses — cannot create order'); return; }

    // Product that store 1 actually stocks
    const { rows: [p1] } = await pool.query(
      `SELECT p.id, p.name, COALESCE(p.price, 100)::numeric AS price
         FROM products p
         JOIN inventory i ON i.product_id = p.id AND i.store_id = 1
        LIMIT 1`
    );
    if (!p1) { console.log('No product with store-1 inventory'); return; }

    // ---- 1. Create fresh order with address_id ----
    const insOrder = await pool.query(`
      INSERT INTO orders (user_id, address_id, status, subtotal, delivery_fee, total_amount,
                          payment_method, payment_status, gps_lat, gps_lng)
      VALUES ($1, $2, 'pending', 100, 20, 120, 'cod', 'pending', 17.4483, 78.3915)
      RETURNING id`, [u.id, addr.id]);
    const orderId = insOrder.rows[0].id;

    await pool.query(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total_price)
      VALUES ($1, $2, $3, 1, $4, $4)`, [orderId, p1.id, p1.name, p1.price]);

    console.log('=== Created test order', orderId, '===');
    console.log('  item: product', p1.id, p1.name, '₹' + p1.price);

    // ---- 2. Store 1 state ----
    console.log('\n=== Store 1 state ===');
    const { rows: [s] } = await pool.query(
      `SELECT id, is_active, is_online, approval_status, latitude, longitude, delivery_radius_km
         FROM stores WHERE id=1`
    );
    console.log('  ', s);

    // ---- 3. findEligibleStores ----
    console.log('\n=== findEligibleStores ===');
    const cfg = await engine.getConfig();
    const items = [{ product_id: p1.id, quantity: 1 }];
    const elig = await engine.findEligibleStores(17.4483, 78.3915, items, cfg);
    console.log('  eligible count:', elig.length);
    for (const e of elig) console.log('   store', e.id, 'dist=' + e.distance_km.toFixed(3) + 'km avail=' + e.availability_ratio);

    // ---- 4. selectBestStore ----
    console.log('\n=== selectBestStore ===');
    const sel = await engine.selectBestStore(17.4483, 78.3915, items);
    console.log('  ok:', sel.ok, '| reason:', sel.reason || '-');
    if (sel.ok) console.log('  best: store', sel.best.id, 'score=' + sel.best.score);

    // ---- 5. dispatchOrder ----
    console.log('\n=== dispatchOrder ===');
    const r = await engine.dispatchOrder(orderId);
    console.log('  ', r);

    // ---- 6. Store accepts → dispatch to driver ----
    if (r.ok && r.storeId) {
      console.log('\n=== storeAccepts ===');
      await engine.storeAccepts(orderId, r.storeId);

      console.log('\n=== dispatchToDriver ===');
      const dr = await engine.dispatchToDriver(orderId);
      console.log('  ', { ok: dr.ok, stage: dr.stage, driverId: dr.driverId, score: dr.score, reason: dr.reason });

      if (dr.ok && dr.driverId) {
        console.log('\n=== driverAccepts ===');
        await engine.driverAccepts(orderId, dr.driverId);
      }
    }

    // ---- 7. Final state ----
    console.log('\n=== Order final state ===');
    const { rows: [fo] } = await pool.query(
      `SELECT id, store_id, driver_id, dispatch_status, status FROM orders WHERE id=$1`, [orderId]
    );
    console.log('  ', fo);

    console.log('\n=== Store offer history ===');
    const { rows: sa } = await pool.query(
      `SELECT store_id, status, score FROM store_assignments WHERE order_id=$1`, [orderId]
    );
    console.log('  ', sa);

    console.log('\n=== Driver offer history ===');
    const { rows: da } = await pool.query(
      `SELECT delivery_partner_id AS driver, status, score FROM delivery_assignments
        WHERE order_id=$1 AND offered_at IS NOT NULL`, [orderId]
    );
    console.log('  ', da);

    console.log('\n=== Inventory at store 1 (product ' + p1.id + ') ===');
    const { rows: inv } = await pool.query(
      `SELECT stock_quantity, reserved_quantity FROM inventory WHERE store_id=1 AND product_id=$1`, [p1.id]
    );
    console.log('  ', inv);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('ERR:', e.message);
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
