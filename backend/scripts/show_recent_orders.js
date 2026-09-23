require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{
  const c = await p.connect();
  try {
    console.log('\n=== 5 most recent orders ===');
    const {rows:o} = await c.query(`SELECT id, store_id, user_id, status, total_amount, created_at FROM orders ORDER BY id DESC LIMIT 5`);
    console.table(o);

    if (o.length) {
      const ids = o.map(r=>r.id);
      console.log('\n=== order_items for those orders ===');
      const {rows:i} = await c.query(
        `SELECT order_id, product_id, product_name, quantity, price, total_price FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY order_id, id`,
        [ids]
      );
      console.table(i);
    }
  } catch(e) { console.error(e.message); } finally { c.release(); await p.end(); }
})();
