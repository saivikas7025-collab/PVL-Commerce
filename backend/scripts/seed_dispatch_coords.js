require('dotenv').config({ quiet: true });
const { pool } = require('../db');

(async () => {
  try {
    // Hyderabad coords — PVL Test Store area (Madhapur / Hitech City)
    const store1 = { lat: 17.4483, lng: 78.3915 };
    const store2 = { lat: 17.4239, lng: 78.4738 };  // Uppal side
    const driver = { lat: 17.4470, lng: 78.3900 };  // 0.2 km from store1

    await pool.query(
      `UPDATE stores SET latitude=$1, longitude=$2, is_online=TRUE WHERE id=1`,
      [store1.lat, store1.lng]
    );
    await pool.query(
      `UPDATE stores SET latitude=$1, longitude=$2 WHERE id=2`,
      [store2.lat, store2.lng]
    );
    await pool.query(
      `UPDATE delivery_partners
          SET current_latitude=$1, current_longitude=$2, is_online=TRUE, is_available=TRUE
        WHERE id=1`,
      [driver.lat, driver.lng]
    );

    // Also add inventory for store 2 so it can compete (copy from store 1)
    const { rows: inv1 } = await pool.query(
      `SELECT product_id, stock_quantity, selling_price FROM inventory WHERE store_id=1`
    );
    for (const r of inv1) {
      await pool.query(
        `INSERT INTO inventory (store_id, product_id, stock_quantity, selling_price, is_available, reserved_quantity)
         VALUES (2, $1, $2, $3, TRUE, 0)
         ON CONFLICT (store_id, product_id) DO UPDATE
           SET stock_quantity = EXCLUDED.stock_quantity,
               selling_price  = EXCLUDED.selling_price,
               is_available   = TRUE`,
        [r.product_id, r.stock_quantity, r.selling_price]
      );
    }

    console.log('Seed done: stores + driver + inventory for store 2');
    const { rows } = await pool.query(
      `SELECT id, name, latitude, longitude, is_online FROM stores ORDER BY id`
    );
    for (const r of rows) console.log('  store', r);
    const { rows: dp } = await pool.query(
      `SELECT id, is_online, is_available, current_latitude, current_longitude FROM delivery_partners`
    );
    for (const r of dp) console.log('  driver', r);
  } catch (e) {
    console.error('SEED ERROR:', e.message);
    process.exitCode = 1;
  } finally { await pool.end(); }
})();
