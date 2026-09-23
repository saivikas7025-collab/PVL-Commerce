const { pool } = require("./db");
Promise.all([
  pool.query("SELECT id,name FROM product_categories ORDER BY id"),
  pool.query("SELECT id,category_id,name FROM product_subcategories ORDER BY category_id,id")
]).then(([c,s]) => {
  console.log("=== PRODUCT CATEGORIES ===");
  console.table(c.rows);
  console.log("=== PRODUCT SUBCATEGORIES ===");
  console.table(s.rows);
  return pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
