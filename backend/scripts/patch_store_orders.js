const fs = require('fs');
const BQ = String.fromCharCode(96);
const file = 'routes/storeDashboard.js';
let src = fs.readFileSync(file, 'utf8');

const startMarker = 'router.get("/orders/:storeId"';
const start = src.indexOf(startMarker);
if (start === -1) { console.error('route not found'); process.exit(1); }
const after = src.slice(start + startMarker.length);
const nextMatch = after.match(/\nrouter\.(get|post|put|patch|delete)\(/);
if (!nextMatch) { console.error('end not found'); process.exit(1); }
const end = start + startMarker.length + nextMatch.index + 1;

const newHandler = `router.get("/orders/:storeId", async (req, res) => {
  const storeId = getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: "Invalid store ID" });
  }
  const status = String(req.query.status || "");
  try {
    let result;
    if (status && status !== "all") {
      result = await pool.query(
        ${BQ}
        SELECT o.*,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'total_price', oi.total_price
            ) ORDER BY oi.id)
            FROM order_items oi
            WHERE oi.order_id = o.id),
            '[]'::json
          ) AS items
        FROM orders o
        WHERE o.store_id = $1 AND o.status = $2
        ORDER BY o.created_at DESC
        ${BQ},
        [storeId, status]
      );
    } else {
      result = await pool.query(
        ${BQ}
        SELECT o.*,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'total_price', oi.total_price
            ) ORDER BY oi.id)
            FROM order_items oi
            WHERE oi.order_id = o.id),
            '[]'::json
          ) AS items
        FROM orders o
        WHERE o.store_id = $1
        ORDER BY o.created_at DESC
        ${BQ},
        [storeId]
      );
    }
    return res.json({ success: true, orders: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
`;

src = src.slice(0, start) + newHandler + '\n' + src.slice(end);
fs.writeFileSync(file, src);
console.log('Patched: items now included in /orders/:storeId');
