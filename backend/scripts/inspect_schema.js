require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: u.hostname, port: Number(u.port || 5432),
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: u.pathname.replace('/', ''), ssl: { rejectUnauthorized: false },
});
(async () => {
  const c = await pool.connect();
  try {
    const t = await c.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' ORDER BY table_name
    `);
    console.log('=== TABLES ===');
    for (const r of t.rows) console.log('  ' + r.table_name);

    for (const tname of ['stores','store_users','users','orders','order_items','products','drivers','settlements','notifications']) {
      try {
        const cols = await c.query(`
          SELECT column_name, data_type FROM information_schema.columns
          WHERE table_name = $1 ORDER BY ordinal_position
        `, [tname]);
        if (!cols.rowCount) continue;
        console.log(`\n=== ${tname} ===`);
        for (const r of cols.rows) console.log('  ' + r.column_name.padEnd(22) + r.data_type);
      } catch(e) {}
    }
  } finally { c.release(); await pool.end(); }
})();
