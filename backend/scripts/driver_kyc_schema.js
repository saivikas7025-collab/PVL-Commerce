require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  const stmts = [
    // ---- extend delivery_partners with KYC fields ----
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS verification_status varchar(40) NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS full_legal_name varchar(200)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS dob date`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS email varchar(150)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS profile_photo_url text`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS address text`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(150)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS emergency_contact_phone varchar(20)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS bank_holder_name varchar(150)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS bank_account_no varchar(40)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS bank_ifsc varchar(20)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS upi_id varchar(80)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS enrolled_selfie_url text`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS enrolled_face_hash varchar(128)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS risk_state varchar(30) NOT NULL DEFAULT 'NORMAL'`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS submitted_at timestamp`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS approved_at timestamp`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS approved_by varchar(120)`,
    `ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS rejection_reason varchar(400)`,

    // ---- driver_documents ----
    `CREATE TABLE IF NOT EXISTS driver_documents (
       id serial PRIMARY KEY,
       driver_id integer NOT NULL,
       doc_type varchar(40) NOT NULL,
       doc_number varchar(80),
       front_url text,
       back_url text,
       expiry_date date,
       status varchar(30) NOT NULL DEFAULT 'pending',
       rejection_reason text,
       uploaded_at timestamp NOT NULL DEFAULT now(),
       reviewed_at timestamp,
       reviewed_by varchar(120)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id)`,
    `CREATE INDEX IF NOT EXISTS idx_driver_docs_type ON driver_documents(driver_id, doc_type)`,
    `CREATE INDEX IF NOT EXISTS idx_driver_docs_status ON driver_documents(status)`,

    // ---- driver_verifications (overall + per-item) ----
    `CREATE TABLE IF NOT EXISTS driver_verifications (
       id serial PRIMARY KEY,
       driver_id integer NOT NULL UNIQUE,
       identity_status varchar(30) NOT NULL DEFAULT 'pending',
       dl_status varchar(30) NOT NULL DEFAULT 'pending',
       rc_status varchar(30) NOT NULL DEFAULT 'pending',
       insurance_status varchar(30) NOT NULL DEFAULT 'pending',
       address_status varchar(30) NOT NULL DEFAULT 'pending',
       selfie_status varchar(30) NOT NULL DEFAULT 'pending',
       bank_status varchar(30) NOT NULL DEFAULT 'pending',
       overall_status varchar(30) NOT NULL DEFAULT 'pending',
       notes text,
       last_reviewed_at timestamp,
       last_reviewed_by varchar(120),
       created_at timestamp NOT NULL DEFAULT now(),
       updated_at timestamp NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_verif_overall ON driver_verifications(overall_status)`,

    // ---- driver_identity_checks ----
    `CREATE TABLE IF NOT EXISTS driver_identity_checks (
       id serial PRIMARY KEY,
       driver_id integer NOT NULL,
       check_type varchar(40) NOT NULL,
       live_selfie_url text,
       provider varchar(60),
       provider_ref varchar(120),
       match_score numeric,
       result varchar(30) NOT NULL DEFAULT 'PENDING',
       reason text,
       created_at timestamp NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_id_checks_driver ON driver_identity_checks(driver_id)`,

    // ---- driver_risk_events ----
    `CREATE TABLE IF NOT EXISTS driver_risk_events (
       id serial PRIMARY KEY,
       driver_id integer NOT NULL,
       event_type varchar(60) NOT NULL,
       severity varchar(20) NOT NULL DEFAULT 'low',
       details jsonb,
       resolved boolean NOT NULL DEFAULT false,
       resolved_at timestamp,
       resolved_by varchar(120),
       created_at timestamp NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_risk_driver ON driver_risk_events(driver_id)`,
    `CREATE INDEX IF NOT EXISTS idx_driver_risk_type ON driver_risk_events(event_type)`,

    // ---- driver_devices ----
    `CREATE TABLE IF NOT EXISTS driver_devices (
       id serial PRIMARY KEY,
       driver_id integer NOT NULL,
       device_fingerprint varchar(180) NOT NULL,
       device_name varchar(120),
       platform varchar(40),
       first_seen_at timestamp NOT NULL DEFAULT now(),
       last_seen_at timestamp NOT NULL DEFAULT now(),
       trusted boolean NOT NULL DEFAULT false,
       UNIQUE(driver_id, device_fingerprint)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_dev_driver ON driver_devices(driver_id)`,

    // ---- driver_sessions ----
    `CREATE TABLE IF NOT EXISTS driver_sessions (
       id serial PRIMARY KEY,
       driver_id integer NOT NULL,
       device_id integer,
       token_hash varchar(128),
       ip varchar(60),
       started_at timestamp NOT NULL DEFAULT now(),
       ended_at timestamp,
       revoked boolean NOT NULL DEFAULT false
     )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_sess_driver ON driver_sessions(driver_id)`,

    // ---- verification_audit_logs (master audit) ----
    `CREATE TABLE IF NOT EXISTS verification_audit_logs (
       id serial PRIMARY KEY,
       actor_type varchar(20) NOT NULL,
       actor_id varchar(120),
       subject_type varchar(20) NOT NULL,
       subject_id integer NOT NULL,
       action varchar(60) NOT NULL,
       from_state varchar(40),
       to_state varchar(40),
       note text,
       created_at timestamp NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_verif_audit_subject ON verification_audit_logs(subject_type, subject_id)`,

    // ---- admin_verification_actions (filtered view for admin decisions) ----
    `CREATE TABLE IF NOT EXISTS admin_verification_actions (
       id serial PRIMARY KEY,
       admin_actor varchar(120) NOT NULL,
       subject_type varchar(20) NOT NULL,
       subject_id integer NOT NULL,
       action varchar(40) NOT NULL,
       target varchar(40),
       reason text,
       created_at timestamp NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_admin_verif_subject ON admin_verification_actions(subject_type, subject_id)`,
  ];
  for (const s of stmts) await pool.query(s);

  // ---- backfill: existing approved drivers become 'approved' ----
  await pool.query(`UPDATE delivery_partners SET verification_status='approved' WHERE approval_status='approved'`);

  // ---- ensure a driver_verifications row for every driver ----
  await pool.query(`INSERT INTO driver_verifications (driver_id) SELECT id FROM delivery_partners ON CONFLICT (driver_id) DO NOTHING`);

  console.log('Driver KYC schema ready.');
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM driver_verifications`);
  console.log('  driver_verifications rows:', rows[0].n);
  process.exit(0);
})().catch(e => { console.error('MIGRATION FAIL:', e.message); process.exit(1); });
