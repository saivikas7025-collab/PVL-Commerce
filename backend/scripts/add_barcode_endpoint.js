const fs = require('fs');
const file = 'routes/storeDashboard.js';
let src = fs.readFileSync(file, 'utf8');
if (src.includes('/product-by-barcode/')) { console.log('endpoint exists — skipping'); process.exit(0); }
const marker = 'module.exports = router';
const idx = src.lastIndexOf(marker);
if (idx === -1) { console.error('marker not found'); process.exit(1); }
const endpoint = `
router.get("/product-by-barcode/:storeId/:barcode", async (req, res) => {
  const storeId = getStoreId(req);
  const barcode = String(req.params.barcode || "").trim();
  if (!storeId || !barcode) {
    return res.status(400).json({ success: false, message: "storeId and barcode required" });
  }
  try {
    const r = await pool.query(
      \`SELECT id, name, unit, price, original_price, image_url, is_active,
              barcode, category_id, approval_status
         FROM products
        WHERE store_id = $1
          AND (barcode = $2 OR CAST(id AS varchar) = $2)
        LIMIT 1\`,
      [storeId, barcode]
    );
    if (!r.rowCount) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, product: r.rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

`;
src = src.slice(0, idx) + endpoint + src.slice(idx);
fs.writeFileSync(file, src);
console.log('endpoint added: /product-by-barcode');
