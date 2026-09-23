require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{
  const {rows} = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='stores' ORDER BY ordinal_position`);
  console.log('stores columns: ' + rows.length);
  for (const r of rows) console.log('  ' + r.column_name.padEnd(24) + r.data_type);
  const {rows:t} = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'store_%' ORDER BY table_name`);
  console.log('\nstore_* tables:');
  for (const r of t) console.log('  ' + r.table_name);
}catch(e){console.error(e)}finally{c.release();await p.end()}})();
