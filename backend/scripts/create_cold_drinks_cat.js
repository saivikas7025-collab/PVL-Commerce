require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: u.hostname, port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace('/', ''),
  ssl: { rejectUnauthorized: false },
});
(async () => {
  const c = await pool.connect();
  try {
    const ex = await c.query(
      `SELECT id FROM categories WHERE section=$1 AND LOWER(name)=LOWER($2)`,
      ['Cold Drinks & Juices', 'Beverages Gift Packs']
    );
    if (ex.rowCount) { console.log('exists:', ex.rows[0].id); return; }
    const r = await c.query(
      `INSERT INTO categories (name, section, is_active, icon, bg_color)
       VALUES ($1, $2, TRUE, $3, $4) RETURNING id`,
      ['Beverages Gift Packs', 'Cold Drinks & Juices', '🎁', '#FCE4EC']
    );
    console.log('created:', r.rows[0].id);
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
