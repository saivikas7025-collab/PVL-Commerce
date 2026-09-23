require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{
  const c = await pool.connect();
  try {
    console.log('\n=== Sections ===');
    const {rows:s} = await c.query(`SELECT section, COUNT(*)::int AS n FROM categories WHERE section IS NOT NULL GROUP BY section ORDER BY section`);
    for (const r of s) console.log(`  ${r.section.padEnd(30)} ${r.n} categories`);
    console.log('\n=== Categories under Dairy ===');
    const {rows:d} = await c.query(`SELECT id, name FROM categories WHERE section = 'Dairy & Breakfast' ORDER BY name`);
    for (const r of d) console.log(`  #${r.id}  ${r.name}`);
    console.log('\n=== Products per Dairy category ===');
    const {rows:p} = await c.query(`SELECT c.name AS cat, COUNT(*)::int AS n FROM products p JOIN categories c ON c.id=p.category_id WHERE c.section='Dairy & Breakfast' GROUP BY c.name ORDER BY c.name`);
    for (const r of p) console.log(`  ${r.cat.padEnd(30)} ${r.n}`);
  } catch(e){console.error(e)} finally { c.release(); await pool.end(); }
})();
