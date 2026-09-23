require('dotenv').config({ quiet: true });
const { pool } = require('../db');
const engine = require('../services/dispatchEngine');

(async () => {
  try {
    console.log('=== 1. Read dispatch config ===');
    const cfg = await engine.getConfig();
    console.log('  store timeout:', cfg.store_offer_timeout_seconds, 's');
    console.log('  driver timeout:', cfg.driver_offer_timeout_seconds, 's');

    console.log('\n=== 2. Store 1 coordinates ===');
    const { rows: [s1] } = await pool.query(`SELECT id, name, latitude, longitude, is_online, delivery_radius_km FROM stores WHERE id=1`);
    console.log('  ', s1);

    console.log('\n=== 3. Inventory at store 1 ===');
    const { rows: inv } = await pool.query(`SELECT product_id, stock_quantity, reserved_quantity, is_available FROM inventory WHERE store_id=1 LIMIT 5`);
    for (const r of inv) console.log('  ', r);

    console.log('\n=== 4. Eligible stores for a dummy order near store 1 ===');
    const items = [{ product_id: inv[0]?.product_id || 1, quantity: 1 }];
    const elig = await engine.findEligibleStores(Number(s1.latitude), Number(s1.longitude), items, cfg);
    console.log('  eligible:', elig.length);
    for (const e of elig) console.log('   id=' + e.id + ' dist=' + e.distance_km.toFixed(2) + 'km avail=' + e.availability_ratio);

    console.log('\n=== 5. Score those stores ===');
    for (const e of elig) console.log('   id=' + e.id + ' score=' + engine.scoreStore(e, cfg));

    console.log('\n=== 6. Eligible drivers near store 1 ===');
    const drv = await engine.findEligibleDrivers(Number(s1.latitude), Number(s1.longitude), cfg);
    console.log('  eligible drivers:', drv.length);
    for (const d of drv) console.log('   id=' + d.id + ' dist=' + d.distance_km.toFixed(2) + 'km');

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('TEST ERROR:', e.message);
    process.exitCode = 1;
  } finally { await pool.end(); }
})();
