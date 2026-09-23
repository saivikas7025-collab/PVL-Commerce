require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{

  for (const t of ['delivery_partners','delivery_assignments','delivery_status_history','inventory']) {
    console.log('\n========== ' + t + ' ==========');
    const {rows} = await c.query(`SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]);
    for (const r of rows) {
      const def = r.column_default ? ' DEFAULT ' + r.column_default.slice(0,40) : '';
      const nn = r.is_nullable === 'NO' ? ' NOT NULL' : '';
      console.log('  ' + r.column_name.padEnd(28) + r.data_type.padEnd(22) + nn + def);
    }
  }

  console.log('\n========== row counts ==========');
  for (const t of ['delivery_partners','delivery_assignments','inventory','stores','orders']) {
    const {rows} = await c.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
    console.log('  ' + t.padEnd(22) + rows[0].n);
  }

  console.log('\n========== sample inventory rows ==========');
  const {rows:inv} = await c.query(`SELECT * FROM inventory LIMIT 3`);
  for (const r of inv) console.log('  ' + JSON.stringify(r));

  console.log('\n========== sample delivery_partners rows ==========');
  const {rows:dp} = await c.query(`SELECT * FROM delivery_partners LIMIT 3`);
  for (const r of dp) console.log('  ' + JSON.stringify(r));

  console.log('\n========== indexes on delivery_assignments ==========');
  const {rows:ix} = await c.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='delivery_assignments'`);
  for (const r of ix) console.log('  ' + r.indexname);

}catch(e){console.error(e.message)}finally{c.release();await p.end()}})();
