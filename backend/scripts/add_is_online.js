require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async () => {
  const c = await pool.connect();
  try {
    await c.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT true`);
    // Existing rows: mirror is_active
    await c.query(`UPDATE stores SET is_online = COALESCE(is_active, true) WHERE is_online IS NULL`);
    console.log('is_online column added');
  } catch(e){ console.error(e.message); process.exitCode=1; }
  finally { c.release(); await pool.end(); }
})();
