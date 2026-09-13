/**
 * GET /api/home
 * Returns the customer app home screen structure:
 *   - sections (Stores in spotlight, Grocery & Kitchen, etc.)
 *   - categories inside each section (with icon + bg_color)
 *   - product_count per category (so we can hide empty ones)
 */
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.section,
        c.section_order,
        c.display_order,
        c.icon,
        c.bg_color,
        (SELECT COUNT(*)::int
         FROM products p
         WHERE p.category_id = c.id AND p.is_active = true) AS product_count
      FROM categories c
      WHERE c.is_active = true
        AND c.section IS NOT NULL
      ORDER BY c.section_order, c.display_order
    `);

    // Group flat rows by section, preserving order
    const sectionsMap = new Map();
    for (const row of result.rows) {
      if (!sectionsMap.has(row.section)) {
        sectionsMap.set(row.section, {
          name: row.section,
          order: row.section_order,
          categories: [],
        });
      }
      sectionsMap.get(row.section).categories.push({
        id: row.id,
        name: row.name,
        icon: row.icon,
        bg_color: row.bg_color,
        product_count: row.product_count,
      });
    }

    const sections = Array.from(sectionsMap.values())
      .sort((a, b) => a.order - b.order);

    res.json({ success: true, sections });
  } catch (error) {
    console.error("HOME API ERROR:", error);
    res.status(500).json({ success: false, message: "Could not load home screen" });
  }
});

module.exports = router;
