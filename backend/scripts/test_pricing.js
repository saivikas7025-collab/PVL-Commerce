require('dotenv').config({ quiet: true });
const { pool } = require('../db');
const engine = require('../services/pricingEngine');

(async () => {
  try {
    console.log('=== 1. Find a test address with valid GPS ===');
    const { rows: [addr] } = await pool.query(
      `SELECT id, latitude, longitude FROM addresses
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND latitude <> 0 AND longitude <> 0
        LIMIT 1`);
    if (!addr) { console.log('No GPS address — create one first'); return; }
    console.log('  addr:', addr);

    console.log('\n=== 2. Find 2 products with inventory at the same store ===');
    const { rows: prods } = await pool.query(`
      SELECT p.id AS product_id, p.name, p.price, p.original_price, i.store_id, i.stock_quantity
        FROM products p
        JOIN inventory i ON i.product_id = p.id
       WHERE i.stock_quantity >= 2
       LIMIT 2`);
    if (prods.length === 0) { console.log('No products with stock'); return; }
    for (const p of prods) console.log('  ', p);

    console.log('\n=== 3. Calculate checkout ===');
    const items = prods.map(p => ({ product_id: p.product_id, store_id: p.store_id, quantity: 2 }));
    const result = await engine.calculateCheckout({
      customer_id: 1,
      address_id: addr.id,
      items,
    });
    delete result._raw_paise;

    console.log('  pricing:');
    for (const [k, v] of Object.entries(result.pricing)) {
      console.log('    ' + k.padEnd(24) + '₹' + v);
    }
    console.log('  delivery:', result.delivery);
    console.log('  coupon:', result.coupon);
    console.log('  line items:');
    for (const li of result.items) console.log('   ', li);

    console.log('\n=== 4. Test coupon (PVL50 if exists) ===');
    const { rows: cps } = await pool.query(`SELECT code FROM coupons WHERE is_active=true LIMIT 1`);
    if (cps.length) {
      const r2 = await engine.calculateCheckout({
        customer_id: 1, address_id: addr.id, items, coupon_code: cps[0].code,
      });
      console.log('  coupon discount:', r2.pricing.coupon_discount);
      console.log('  grand total:', r2.pricing.grand_total);
    } else {
      console.log('  (no active coupons)');
    }

    console.log('\n=== DONE ===');
  } catch (e) { console.error('TEST ERROR:', e.message); console.error(e.stack); }
  finally { await pool.end(); }
})();
