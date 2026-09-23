require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async () => {
  const c = await pool.connect();
  try {
    await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode varchar(64)`);
    await c.query(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL`);
    await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0`);
    await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 5`);
    console.log('barcode, purchase_price, min_stock columns ready');
  } catch(e){ console.error(e.message); process.exitCode=1; }
  finally { c.release(); await pool.end(); }
})();
