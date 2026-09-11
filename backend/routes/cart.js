/**
 * Cart routes.
 *
 * Every route requires a valid JWT. The user is always identified from
 * the token (req.userId), never from a client-supplied parameter.
 */
const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/cart  — current user's cart
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ci.id AS cart_item_id,
         ci.product_id,
         p.name,
         p.description,
         p.unit,
         ci.price,
         ci.quantity,
         (ci.price * ci.quantity) AS item_total,
         p.image_url,
         cat.name AS category
       FROM carts c
       JOIN cart_items ci ON ci.cart_id = c.id
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN categories cat ON cat.id = p.category_id
       WHERE c.user_id = $1
       ORDER BY ci.id`,
      [req.userId]
    );
    const items = result.rows;
    const total = items.reduce((sum, i) => sum + Number(i.item_total), 0);
    const quantity = items.reduce((sum, i) => sum + Number(i.quantity), 0);
    res.json({ success: true, cart: items, total, quantity });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to load cart' });
  }
});

// POST /api/cart  — add an item (increments if exists)
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity || 1);
    if (!Number.isInteger(productId) || productId <= 0 ||
        !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid cart item' });
    }

    await client.query('BEGIN');
    const productResult = await client.query(
      `SELECT id, price FROM products WHERE id = $1 AND is_active = TRUE`,
      [productId]
    );
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Product not available' });
    }
    const product = productResult.rows[0];

    let cartResult = await client.query(
      `SELECT id FROM carts WHERE user_id = $1 LIMIT 1`,
      [req.userId]
    );
    let cartId;
    if (cartResult.rows.length === 0) {
      const newCart = await client.query(
        `INSERT INTO carts (user_id) VALUES ($1) RETURNING id`,
        [req.userId]
      );
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    const existing = await client.query(
      `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
      [cartId, productId]
    );
    if (existing.rows.length > 0) {
      const newQty = Number(existing.rows[0].quantity) + quantity;
      await client.query(
        `UPDATE cart_items SET quantity = $1, price = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [newQty, product.price, existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [cartId, productId, quantity, product.price]
      );
    }

    await client.query(
      `UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [cartId]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Product added to cart' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Add cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  } finally {
    client.release();
  }
});

// PUT /api/cart/:productId  — set quantity (0 removes)
router.put('/:productId', authenticate, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }
    if (quantity === 0) {
      await pool.query(
        `DELETE FROM cart_items ci USING carts c
         WHERE ci.cart_id = c.id AND c.user_id = $1 AND ci.product_id = $2`,
        [req.userId, productId]
      );
    } else {
      const upd = await pool.query(
        `UPDATE cart_items ci
         SET quantity = $1, updated_at = CURRENT_TIMESTAMP
         FROM carts c
         WHERE ci.cart_id = c.id AND c.user_id = $2 AND ci.product_id = $3
         RETURNING ci.id`,
        [quantity, req.userId, productId]
      );
      if (upd.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cart item not found' });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
});

// DELETE /api/cart/:productId  — remove one item
router.delete('/:productId', authenticate, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const result = await pool.query(
      `DELETE FROM cart_items ci USING carts c
       WHERE ci.cart_id = c.id AND c.user_id = $1 AND ci.product_id = $2
       RETURNING ci.id`,
      [req.userId, productId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
});

// DELETE /api/cart  — empty cart
router.delete('/', authenticate, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM cart_items ci USING carts c
       WHERE ci.cart_id = c.id AND c.user_id = $1`,
      [req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

module.exports = router;
