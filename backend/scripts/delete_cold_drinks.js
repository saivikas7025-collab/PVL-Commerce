require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
const SECTION = 'Cold Drinks & Juices';
const STORE_ID = 1;
(async () => {
  const c = await pool.connect();
  try {
    const before = await c.query(
      `SELECT COUNT(*)::int AS n FROM products p JOIN categories c ON c.id=p.category_id
        WHERE p.store_id=$1 AND c.section=$2`, [STORE_ID, SECTION]);
    console.log('Before:', before.rows[0].n);

    await c.query('BEGIN');
    const del = await c.query(
      `DELETE FROM products
        WHERE store_id=$1
          AND category_id IN (SELECT id FROM categories WHERE section=$2)`,
      [STORE_ID, SECTION]);
    await c.query('COMMIT');
    console.log('Deleted:', del.rowCount);
  } catch(e) { try{await c.query('ROLLBACK')}catch{} console.error('FAILED:', e.message); process.exitCode=1; }
  finally { c.release(); await pool.end(); }
})();
