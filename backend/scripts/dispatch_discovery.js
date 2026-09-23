require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{
  const {rows:tables} = await c.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
  `);
  console.log('=== ALL TABLES ===');
  for (const t of tables) console.log('  ' + t.table_name);

  console.log('\n=== orders columns ===');
  const {rows:oc} = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='orders' ORDER BY ordinal_position`);
  for (const r of oc) console.log('  ' + r.column_name.padEnd(28) + r.data_type);

  console.log('\n=== Is there a drivers table? ===');
  const hasDriver = tables.some(t => /driver|rider|courier/i.test(t.table_name));
  console.log(hasDriver ? '  YES' : '  NO');

  console.log('\n=== Is there an inventory/stock table? ===');
  const invTables = tables.filter(t => /inventory|stock|product_store|store_product/i.test(t.table_name));
  console.log(invTables.length ? invTables.map(t => '  ' + t.table_name).join('\n') : '  NO');

  console.log('\n=== order_items columns ===');
  const {rows:oic} = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='order_items' ORDER BY ordinal_position`);
  for (const r of oic) console.log('  ' + r.column_name.padEnd(28) + r.data_type);
}catch(e){console.error(e.message)}finally{c.release();await p.end()}})();
