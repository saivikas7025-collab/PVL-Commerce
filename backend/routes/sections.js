// backend/routes/sections.js
// Mounted at /api by server.js
const express = require('express');
const router  = express.Router();

let pool;
try {
  pool = require('../db');
  if (pool && pool.pool) pool = pool.pool;
} catch (_) {
  try { pool = require('../config/db'); } catch (_) { pool = null; }
}
if (!pool) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.warn('[sections] using ad-hoc pool — export your shared pool from ../db');
}

// GET /api/sections — top-level grid for the Categories tab
router.get('/sections', async (req, res) => {
  try {
    const storeId = Number(req.query.store_id) || 1;
    const { rows } = await pool.query(`
      SELECT s.name,
             s.display_order,
             s.icon,
             s.bg_color,
             COUNT(DISTINCT c.id)::int      AS subcategory_count,
             COALESCE(SUM(p.cnt), 0)::int   AS product_count
        FROM sections s
        LEFT JOIN categories c
               ON c.section = s.name AND c.is_active = TRUE
        LEFT JOIN LATERAL (
               SELECT COUNT(*) AS cnt
                 FROM products p
                WHERE p.category_id     = c.id
                  AND p.is_active       = TRUE
                  AND p.store_id        = $1
                  AND p.approval_status = 'approved'
             ) p ON TRUE
       WHERE s.is_active = TRUE
       GROUP BY s.name, s.display_order, s.icon, s.bg_color
       ORDER BY s.display_order, s.name
    `, [storeId]);
    res.json(rows);
  } catch (e) {
    console.error('GET /sections', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sections/:section/categories — left-rail chips
router.get('/sections/:section/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, icon, bg_color, display_order
        FROM categories
       WHERE section = $1 AND is_active = TRUE
       ORDER BY display_order NULLS LAST, name
    `, [req.params.section]);
    res.json(rows);
  } catch (e) {
    console.error('GET /sections/:section/categories', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sections/:section/products?category_id=123
// SELECT p.* so Product.fromJson has every field it expects.
router.get('/sections/:section/products', async (req, res) => {
  try {
    const storeId = Number(req.query.store_id) || 1;
    const catId   = req.query.category_id ? Number(req.query.category_id) : null;

    const params = [req.params.section, storeId];
    let sql = `
      SELECT p.*,
             c.name    AS category_name,
             c.section AS section_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
       WHERE c.section = $1
         AND c.is_active = TRUE
         AND p.is_active = TRUE
         AND p.approval_status = 'approved'
         AND p.store_id = $2
    `;
    if (catId) { params.push(catId); sql += ` AND p.category_id = $${params.length}`; }
    sql += ` ORDER BY c.display_order NULLS LAST, p.name LIMIT 500`;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('GET /sections/:section/products', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
