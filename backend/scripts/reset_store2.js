require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{
  await c.query(`UPDATE stores SET approval_status='pending', approved_at=NULL, approved_by=NULL, rejection_reason=NULL WHERE id=2`);
  await c.query(`DELETE FROM store_approval_history WHERE store_id=2`);
  console.log('Reset store 2 to pending, wiped history');
}finally{c.release();await p.end()}})();
