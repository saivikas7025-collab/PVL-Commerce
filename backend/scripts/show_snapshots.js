require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  const { rows } = await pool.query(`
    SELECT order_id, mrp_total, items_total, delivery_charge, grand_total, distance_km
      FROM order_price_breakdown ORDER BY id DESC LIMIT 3`);
  console.log('Recent price snapshots:');
  for (const r of rows) console.log(' ', r);
  await pool.end();
})();
