require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{
  const {rows} = await c.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
     WHERE conrelid = 'stores'::regclass
       AND contype = 'c'
  `);
  console.log('CHECK constraints on stores:');
  for (const r of rows) console.log('  ' + r.conname + ': ' + r.def);
}catch(e){console.error(e.message)}finally{c.release();await p.end()}})();
