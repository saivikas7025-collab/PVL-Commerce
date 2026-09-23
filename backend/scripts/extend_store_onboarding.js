require('dotenv').config();
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const pool = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async () => {
  const c = await pool.connect();
  try {
    const stmts = [
      // ---- Business info on stores ----
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS legal_name varchar(200)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_name varchar(150)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_type varchar(40)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS pan varchar(20)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS gstin varchar(30)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS alt_phone varchar(20)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS city varchar(80)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS state varchar(80)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS pincode varchar(10)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS fssai_license varchar(30)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS opening_time varchar(10)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS closing_time varchar(10)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS prep_time_minutes integer DEFAULT 15`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_radius_km numeric DEFAULT 5`,
      // ---- Store categories (array of strings) ----
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}'`,
      // ---- Bank / settlement ----
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_holder_name varchar(150)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_name varchar(150)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_account_no varchar(40)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_ifsc varchar(20)`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS upi_id varchar(80)`,
      // ---- Verification flags ----
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS kyc_verified boolean DEFAULT false`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_verified boolean DEFAULT false`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS address_verified boolean DEFAULT false`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS licence_verified boolean DEFAULT false`,
      `ALTER TABLE stores ADD COLUMN IF NOT EXISTS location_verified boolean DEFAULT false`,
      // ---- Documents upload (URLs) ----
      `CREATE TABLE IF NOT EXISTS store_documents (
         id serial PRIMARY KEY,
         store_id integer NOT NULL,
         doc_type varchar(40) NOT NULL,
         doc_url text NOT NULL,
         uploaded_at timestamp DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS idx_store_documents_store ON store_documents(store_id)`,
      // ---- Approval audit trail ----
      `CREATE TABLE IF NOT EXISTS store_approval_history (
         id serial PRIMARY KEY,
         store_id integer NOT NULL,
         action varchar(40) NOT NULL,
         from_status varchar(40),
         to_status varchar(40),
         actor varchar(120),
         note text,
         created_at timestamp DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS idx_store_approval_history_store ON store_approval_history(store_id)`,
    ];
    for (const s of stmts) await c.query(s);
    console.log('Schema extended: stores columns + store_documents + store_approval_history');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
