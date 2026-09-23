const fs = require('fs');
const file = 'routes/storeDashboard.js';
let src = fs.readFileSync(file, 'utf8');
if (src.includes('/pos-sale')) { console.log('pos-sale exists'); process.exit(0); }
const marker = 'module.exports = router';
const idx = src.lastIndexOf(marker);
const endpoint = `
router.post("/pos-sale", async (req, res) => {
  const body = req.body || {};
  const storeId = Number(body.store_id);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!storeId || !items.length) {
    return res.status(400).json({ success: false, message: "store_id and items required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const subtotal = Number(body.subtotal || 0);
    const discount = Number(body.discount || 0);
    const total = Number(body.total || subtotal - discount);
    const paymentMethod = String(body.payment_method || "cash");
    const ins = await client.query(
      \`INSERT INTO orders
         (user_id, store_id, address_id, status, subtotal, delivery_fee,
          discount, total_amount, payment_method, payment_status, notes)
       VALUES (NULL, $1, NULL, 'delivered', $2, 0, $3, $4, $5, 'paid', $6)
       RETURNING id\`,
      [storeId, subtotal, discount, total, paymentMethod,
       \`POS sale · customer=\${body.customer_name || 'Walk-in'}\`]
    );
    const orderId = ins.rows[0].id;
    for (const it of items) {
      await client.query(
        \`INSERT INTO order_items
           (order_id, product_id, product_name, quantity, price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)\`,
        [orderId, it.product_id, it.product_name, it.quantity, it.price, it.total_price]
      );
    }
    await client.query("COMMIT");
    return res.json({ success: true, sale_id: orderId });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    return res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

`;
src = src.slice(0, idx) + endpoint + src.slice(idx);
fs.writeFileSync(file, src);
console.log('endpoint added: POST /pos-sale');
