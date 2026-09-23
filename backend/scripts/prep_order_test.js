require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    const { rows: [u] } = await pool.query(`SELECT id FROM users WHERE role='customer' LIMIT 1`);
    const { rows: [a] } = await pool.query(`SELECT id FROM addresses WHERE user_id=$1 LIMIT 1`, [u.id]);
    const { rows: [p] } = await pool.query(`SELECT p.id, i.store_id FROM products p JOIN inventory i ON i.product_id=p.id WHERE i.stock_quantity>=2 LIMIT 1`);

    // Clear cart, add one product
    await pool.query(`DELETE FROM cart_items ci USING carts c WHERE ci.cart_id=c.id AND c.user_id=$1`, [u.id]);
    const { rows: [c] } = await pool.query(`SELECT id FROM carts WHERE user_id=$1 LIMIT 1`, [u.id]);
    if (!c) {
      const ins = await pool.query(`INSERT INTO carts (user_id) VALUES ($1) RETURNING id`, [u.id]);
      await pool.query(`INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES ($1,$2,2,$3)`,
        [ins.rows[0].id, p.id, 60]);
      console.log('Created cart with product', p.id);
    } else {
      await pool.query(`INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES ($1,$2,2,$3)`,
        [c.id, p.id, 60]);
      console.log('Added product', p.id, 'to cart', c.id);
    }

    // Mint JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: u.id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('\nUSER=' + u.id + ' ADDR=' + a.id + ' TOKEN=' + token);
  } finally { await pool.end(); }
})();
