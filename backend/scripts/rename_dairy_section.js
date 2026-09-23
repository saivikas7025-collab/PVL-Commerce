require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async () => {
  const c = await pool.connect();
  try {
    // Show before
    const a = await c.query(`SELECT COUNT(*)::int AS n FROM categories WHERE section='Dairy & Breakfast'`);
    console.log('Categories under "Dairy & Breakfast":', a.rows[0].n);

    // Rename
    const r = await c.query(`UPDATE categories SET section='Dairy, Bread & Eggs' WHERE section='Dairy & Breakfast'`);
    console.log('Renamed categories:', r.rowCount);

    // Verify
    const b = await c.query(`SELECT COUNT(*)::int AS n FROM categories WHERE section='Dairy, Bread & Eggs'`);
    console.log('Categories now under "Dairy, Bread & Eggs":', b.rows[0].n);
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
