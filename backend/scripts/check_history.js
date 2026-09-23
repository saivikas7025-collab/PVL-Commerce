require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{
  const {rows} = await c.query(`SELECT action, from_status, to_status, actor, note, created_at FROM store_approval_history WHERE store_id=2 ORDER BY id`);
  console.table(rows);
}catch(e){console.error(e.message)}finally{c.release();await p.end()}})();
