require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{
  const stmts = [
    // --- driver partner additions ---
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS reliability_score numeric DEFAULT 5.0`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT 5.0`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS active_orders_count integer DEFAULT 0`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS completed_deliveries integer DEFAULT 0`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS last_seen_at timestamp`,

    // --- delivery_assignments additions ---
    `ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS offered_at timestamp DEFAULT now()`,
    `ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS expires_at timestamp`,
    `ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS score numeric`,
    `ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS rejection_reason text`,
    `ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS responded_at timestamp`,

    // --- inventory additions ---
    `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reserved_quantity integer NOT NULL DEFAULT 0`,

    // --- stores additions ---
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS reliability_score numeric DEFAULT 5.0`,
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS current_load integer DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN IF NOT EXISTS avg_prep_minutes_actual integer DEFAULT 15`,

    // --- orders additions ---
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_status varchar(40) DEFAULT 'unassigned'`,

    // --- store_assignments table ---
    `CREATE TABLE IF NOT EXISTS store_assignments (
       id serial PRIMARY KEY,
       order_id integer NOT NULL,
       store_id integer NOT NULL,
       status varchar(40) NOT NULL DEFAULT 'offered',
       score numeric,
       offered_at timestamp NOT NULL DEFAULT now(),
       expires_at timestamp,
       responded_at timestamp,
       rejection_reason text
     )`,
    `CREATE INDEX IF NOT EXISTS idx_store_assignments_order ON store_assignments(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_store_assignments_store ON store_assignments(store_id)`,
    `CREATE INDEX IF NOT EXISTS idx_store_assignments_status ON store_assignments(status)`,

    // --- inventory reservations (audit trail of reserve/release) ---
    `CREATE TABLE IF NOT EXISTS inventory_reservations (
       id serial PRIMARY KEY,
       order_id integer NOT NULL,
       store_id integer NOT NULL,
       product_id integer NOT NULL,
       quantity integer NOT NULL,
       status varchar(20) NOT NULL DEFAULT 'reserved',
       created_at timestamp NOT NULL DEFAULT now(),
       released_at timestamp
     )`,
    `CREATE INDEX IF NOT EXISTS idx_inv_res_order ON inventory_reservations(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inv_res_store_product ON inventory_reservations(store_id, product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inv_res_status ON inventory_reservations(status)`,

    // --- dispatch_config (single row) ---
    `CREATE TABLE IF NOT EXISTS dispatch_config (
       id integer PRIMARY KEY DEFAULT 1,
       store_weight_availability numeric NOT NULL DEFAULT 0.35,
       store_weight_distance numeric NOT NULL DEFAULT 0.20,
       store_weight_prep_time numeric NOT NULL DEFAULT 0.20,
       store_weight_workload numeric NOT NULL DEFAULT 0.10,
       store_weight_reliability numeric NOT NULL DEFAULT 0.10,
       store_weight_preference numeric NOT NULL DEFAULT 0.05,
       driver_weight_distance numeric NOT NULL DEFAULT 0.40,
       driver_weight_workload numeric NOT NULL DEFAULT 0.20,
       driver_weight_pickup_time numeric NOT NULL DEFAULT 0.20,
       driver_weight_route numeric NOT NULL DEFAULT 0.10,
       driver_weight_availability numeric NOT NULL DEFAULT 0.10,
       store_offer_timeout_seconds integer NOT NULL DEFAULT 90,
       driver_offer_timeout_seconds integer NOT NULL DEFAULT 30,
       max_store_distance_km numeric NOT NULL DEFAULT 10,
       max_driver_distance_km numeric NOT NULL DEFAULT 8,
       updated_at timestamp NOT NULL DEFAULT now()
     )`,
    `INSERT INTO dispatch_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
  ];
  for (const s of stmts) await c.query(s);
  console.log('Schema extended for dispatch engine.');
}catch(e){console.error('MIGRATION ERROR:', e.message); process.exitCode=1}finally{c.release();await p.end()}})();
