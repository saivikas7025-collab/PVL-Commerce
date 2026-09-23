require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    console.log('=== Existing tables ===');
    const { rows: t } = await pool.query(`
      SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_type='BASE TABLE'
       ORDER BY table_name`);
    for (const x of t) console.log('  ' + x.table_name);

    console.log('\n=== products columns ===');
    const { rows: pc } = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name='products' ORDER BY ordinal_position`);
    for (const r of pc) console.log('  ' + r.column_name.padEnd(28) + r.data_type);

    console.log('\n=== orders columns ===');
    const { rows: oc } = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name='orders' ORDER BY ordinal_position`);
    for (const r of oc) console.log('  ' + r.column_name.padEnd(28) + r.data_type);

    console.log('\n=== cart_items columns ===');
    const { rows: cc } = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name='cart_items' ORDER BY ordinal_position`);
    for (const r of cc) console.log('  ' + r.column_name.padEnd(28) + r.data_type);

    console.log('\n=== coupons columns ===');
    const { rows: cp } = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name='coupons' ORDER BY ordinal_position`);
    for (const r of cp) console.log('  ' + r.column_name.padEnd(28) + r.data_type);

    console.log('\n=== checkout/order routes files ===');
    const fs = require('fs');
    const files = fs.readdirSync('./routes').filter(f => f.endsWith('.js'));
    for (const f of files) console.log('  routes/' + f);

    await pool.end();
  } catch (e) { console.error('ERR:', e.message); }
})();
