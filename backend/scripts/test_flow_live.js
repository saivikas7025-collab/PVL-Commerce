require('dotenv').config({ quiet: true });
const { pool } = require('../db');
const engine = require('../services/dispatchEngine');
(async () => {
  try {
    const { rows: [u] } = await pool.query(`SELECT id FROM users LIMIT 1`);
    const { rows: [a] } = await pool.query(`SELECT id FROM addresses LIMIT 1`);
    const { rows: [p] } = await pool.query(
      `SELECT p.id, p.name, COALESCE(p.price,100)::numeric AS price FROM products p
         JOIN inventory i ON i.product_id=p.id AND i.store_id=1 LIMIT 1`);
    const ins = await pool.query(`
      INSERT INTO orders (user_id, address_id, status, subtotal, delivery_fee, total_amount,
                          payment_method, payment_status, gps_lat, gps_lng)
      VALUES ($1,$2,'pending',100,20,120,'cod','pending',17.4483,78.3915) RETURNING id`, [u.id, a.id]);
    const oid = ins.rows[0].id;
    await pool.query(`INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total_price)
                      VALUES ($1,$2,$3,1,$4,$4)`, [oid, p.id, p.name, p.price]);
    const r = await engine.dispatchOrder(oid);
    console.log('Order', oid, 'dispatched → store', r.storeId, '(score', r.score + ')');
    console.log('→ STORE app: tap ↻ refresh');
  } finally { await pool.end(); }
})();
