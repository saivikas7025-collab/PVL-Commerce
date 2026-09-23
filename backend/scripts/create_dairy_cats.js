require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
const MISSING = [
  { name: 'Flakes & Kids Cereals',       icon: '🥣', bg: '#FCEBC9' },
  { name: 'Poha, Daliya & Other Grains', icon: '🌾', bg: '#FCEBC9' },
  { name: 'Energy Bars',                 icon: '⚡', bg: '#FFF9C4' },
  { name: 'Lassi, Shakes & More',        icon: '🥛', bg: '#FFF3E0' },
];
(async () => {
  const c = await pool.connect();
  try {
    for (const m of MISSING) {
      const ex = await c.query(
        `SELECT id FROM categories WHERE section='Dairy & Breakfast' AND LOWER(name)=LOWER($1)`,
        [m.name]
      );
      if (ex.rowCount) { console.log('exists:', m.name, '#'+ex.rows[0].id); continue; }
      const r = await c.query(
        `INSERT INTO categories (name, section, is_active, icon, bg_color)
         VALUES ($1, 'Dairy & Breakfast', TRUE, $2, $3) RETURNING id`,
        [m.name, m.icon, m.bg]
      );
      console.log('created:', m.name, '#'+r.rows[0].id);
    }
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
