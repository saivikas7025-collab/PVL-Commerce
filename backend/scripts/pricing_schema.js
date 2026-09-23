require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  const stmts = [
    // -- Global pricing config (single row id=1)
    `CREATE TABLE IF NOT EXISTS pricing_config (
       id integer PRIMARY KEY DEFAULT 1,
       handling_fee_type varchar(20) NOT NULL DEFAULT 'fixed',
       handling_fee_value numeric(10,2) NOT NULL DEFAULT 5,
       handling_fee_min numeric(10,2) NOT NULL DEFAULT 0,
       handling_fee_max numeric(10,2) NOT NULL DEFAULT 50,
       platform_fee_enabled boolean NOT NULL DEFAULT true,
       platform_fee_type varchar(20) NOT NULL DEFAULT 'fixed',
       platform_fee_value numeric(10,2) NOT NULL DEFAULT 5,
       platform_fee_min numeric(10,2) NOT NULL DEFAULT 0,
       platform_fee_max numeric(10,2) NOT NULL DEFAULT 50,
       tax_percent numeric(5,2) NOT NULL DEFAULT 5,
       tax_inclusive boolean NOT NULL DEFAULT false,
       free_delivery_threshold numeric(10,2) NOT NULL DEFAULT 499,
       min_order_amount numeric(10,2) NOT NULL DEFAULT 99,
       updated_at timestamp NOT NULL DEFAULT now()
     )`,
    `INSERT INTO pricing_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,

    // -- Delivery distance slabs
    `CREATE TABLE IF NOT EXISTS delivery_slabs (
       id serial PRIMARY KEY,
       min_km numeric(5,2) NOT NULL,
       max_km numeric(5,2) NOT NULL,
       delivery_fee numeric(10,2) NOT NULL,
       is_active boolean NOT NULL DEFAULT true,
       created_at timestamp NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_delivery_slabs_range ON delivery_slabs(min_km, max_km) WHERE is_active=true`,

    // -- Immutable per-order price snapshot
    `CREATE TABLE IF NOT EXISTS order_price_breakdown (
       id serial PRIMARY KEY,
       order_id integer NOT NULL UNIQUE,
       mrp_total numeric(10,2) NOT NULL DEFAULT 0,
       product_discount numeric(10,2) NOT NULL DEFAULT 0,
       items_total numeric(10,2) NOT NULL DEFAULT 0,
       handling_charge numeric(10,2) NOT NULL DEFAULT 0,
       delivery_charge numeric(10,2) NOT NULL DEFAULT 0,
       platform_fee numeric(10,2) NOT NULL DEFAULT 0,
       coupon_code varchar(40),
       coupon_discount numeric(10,2) NOT NULL DEFAULT 0,
       tax numeric(10,2) NOT NULL DEFAULT 0,
       total_savings numeric(10,2) NOT NULL DEFAULT 0,
       grand_total numeric(10,2) NOT NULL DEFAULT 0,
       distance_km numeric(6,2) NOT NULL DEFAULT 0,
       snapshot_json jsonb NOT NULL,
       created_at timestamp NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_opb_order ON order_price_breakdown(order_id)`,

    // -- Tax % per product (optional override; falls back to pricing_config)
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_percent numeric(5,2)`,
  ];
  for (const s of stmts) await pool.query(s);

  // -- Seed default delivery slabs (Hyderabad-tier pricing)
  const { rowCount } = await pool.query(`SELECT 1 FROM delivery_slabs LIMIT 1`);
  if (rowCount === 0) {
    await pool.query(`
      INSERT INTO delivery_slabs (min_km, max_km, delivery_fee) VALUES
        (0,   3,   20),
        (3,   5,   30),
        (5,   8,   40),
        (8,  10,   60),
        (10, 999, 100)
    `);
    console.log('Seeded default delivery slabs.');
  }

  console.log('Schema ready.');
  const { rows } = await pool.query(`SELECT * FROM pricing_config WHERE id=1`);
  console.log('  pricing_config:', rows[0]);
  const { rows: slabs } = await pool.query(`SELECT min_km, max_km, delivery_fee FROM delivery_slabs ORDER BY min_km`);
  console.log('  delivery_slabs:');
  for (const s of slabs) console.log('   ', s);
  await pool.end();
})().catch(e => { console.error('MIGRATION FAIL:', e.message); process.exit(1); });
