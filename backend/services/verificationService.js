const { pool } = require('../db');

const DOC_TYPES = ['IDENTITY','DL','RC','INSURANCE','ADDRESS','PAN','BANK','SELFIE'];
const DOC_STATUSES = ['pending','under_review','approved','rejected','expired'];
const OVERALL_STATUSES = ['pending','under_review','approved','rejected','suspended'];

// Map document type → column in driver_verifications
const DOC_TO_COLUMN = {
  IDENTITY: 'identity_status',
  DL: 'dl_status',
  RC: 'rc_status',
  INSURANCE: 'insurance_status',
  ADDRESS: 'address_status',
  SELFIE: 'selfie_status',
  BANK: 'bank_status',
  PAN: 'identity_status', // PAN shares identity column for simplicity
};

async function getDriverVerification(driverId) {
  const { rows: [driver] } = await pool.query(`
    SELECT id, user_id, vehicle_type, vehicle_number, is_online, is_available,
           approval_status, verification_status, risk_state,
           full_legal_name, dob, email, profile_photo_url, address,
           emergency_contact_name, emergency_contact_phone,
           bank_holder_name, bank_account_no, bank_ifsc, upi_id,
           enrolled_selfie_url, submitted_at, approved_at, approved_by, rejection_reason
      FROM delivery_partners WHERE id=$1`, [driverId]);
  if (!driver) return null;

  const { rows: docs } = await pool.query(
    `SELECT id, doc_type, doc_number, front_url, back_url, expiry_date,
            status, rejection_reason, uploaded_at, reviewed_at, reviewed_by
       FROM driver_documents WHERE driver_id=$1 ORDER BY doc_type`, [driverId]);

  const { rows: [verif] } = await pool.query(
    `SELECT * FROM driver_verifications WHERE driver_id=$1`, [driverId]);

  const { rows: checks } = await pool.query(
    `SELECT id, check_type, result, reason, created_at
       FROM driver_identity_checks WHERE driver_id=$1 ORDER BY id DESC LIMIT 10`, [driverId]);

  const { rows: risks } = await pool.query(
    `SELECT id, event_type, severity, details, resolved, created_at
       FROM driver_risk_events WHERE driver_id=$1 ORDER BY id DESC LIMIT 20`, [driverId]);

  return { driver, documents: docs, verification: verif, identity_checks: checks, risk_events: risks };
}

async function upsertDocument(driverId, { doc_type, doc_number, front_url, back_url, expiry_date }) {
  if (!DOC_TYPES.includes(doc_type)) throw new Error('Invalid doc_type');
  // Replace any pending/rejected doc of the same type (keep approved ones locked)
  await pool.query(
    `DELETE FROM driver_documents WHERE driver_id=$1 AND doc_type=$2 AND status IN ('pending','rejected','expired')`,
    [driverId, doc_type]);
  const { rows: [doc] } = await pool.query(
    `INSERT INTO driver_documents (driver_id, doc_type, doc_number, front_url, back_url, expiry_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
    [driverId, doc_type, doc_number || null, front_url || null, back_url || null, expiry_date || null]);
  await pool.query(
    `UPDATE driver_verifications SET ${DOC_TO_COLUMN[doc_type]}='pending', updated_at=now() WHERE driver_id=$1`,
    [driverId]);
  return doc;
}

async function recordAudit({ actor_type, actor_id, subject_type, subject_id, action, from_state, to_state, note }) {
  await pool.query(
    `INSERT INTO verification_audit_logs
       (actor_type, actor_id, subject_type, subject_id, action, from_state, to_state, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [actor_type, actor_id || null, subject_type, subject_id, action,
     from_state || null, to_state || null, note || null]);
}

async function recordRiskEvent(driverId, eventType, severity, details) {
  await pool.query(
    `INSERT INTO driver_risk_events (driver_id, event_type, severity, details)
     VALUES ($1,$2,$3,$4)`,
    [driverId, eventType, severity || 'low', details || null]);
  // Aggregate a risk_state
  const { rows: [agg] } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE severity='high' AND NOT resolved) AS hi,
       COUNT(*) FILTER (WHERE severity='medium' AND NOT resolved) AS med
       FROM driver_risk_events WHERE driver_id=$1`, [driverId]);
  const state = (agg.hi > 0) ? 'VERIFICATION_REQUIRED'
              : (agg.med > 0) ? 'REVIEW_REQUIRED'
              : 'NORMAL';
  await pool.query(`UPDATE delivery_partners SET risk_state=$1 WHERE id=$2`, [state, driverId]);
  return state;
}

async function submitApplication(driverId) {
  const { rows: [v] } = await pool.query(`SELECT * FROM driver_verifications WHERE driver_id=$1`, [driverId]);
  if (!v) throw new Error('No verification row — driver not found');
  const required = ['identity_status','dl_status','rc_status','insurance_status','address_status','selfie_status','bank_status'];
  const missing = required.filter(k => v[k] === 'pending' && false); // pending == not submitted is fine; we don't gate on docs, we gate on submit

  await pool.query(
    `UPDATE delivery_partners SET verification_status='under_review', submitted_at=now() WHERE id=$1`,
    [driverId]);
  await pool.query(
    `UPDATE driver_verifications SET overall_status='under_review', updated_at=now() WHERE driver_id=$1`,
    [driverId]);
  await recordAudit({
    actor_type: 'DRIVER', actor_id: String(driverId),
    subject_type: 'DRIVER', subject_id: driverId,
    action: 'SUBMITTED', from_state: 'pending', to_state: 'under_review',
    note: 'Driver submitted KYC for review',
  });
  return true;
}

async function adminDecision(driverId, action, adminActor, reason) {
  const { rows: [cur] } = await pool.query(
    `SELECT verification_status FROM delivery_partners WHERE id=$1`, [driverId]);
  if (!cur) throw new Error('Driver not found');
  const from = cur.verification_status;

  let to = from;
  const patch = {};
  if (action === 'approve') { to = 'approved'; patch.approval_status = 'approved'; patch.approved_at = new Date(); patch.approved_by = adminActor; }
  else if (action === 'reject') { to = 'rejected'; patch.rejection_reason = reason || 'Not specified'; }
  else if (action === 'request-info') { to = 'under_review'; patch.rejection_reason = reason || null; }
  else if (action === 'suspend') { to = 'suspended'; patch.is_online = false; patch.is_available = false; }
  else if (action === 'unsuspend') { to = 'under_review'; }
  else throw new Error('Unknown action: ' + action);

  const sets = ['verification_status = $1', 'updated_at = now()'];
  const vals = [to];
  for (const [k, v] of Object.entries(patch)) { vals.push(v); sets.push(`${k} = $${vals.length}`); }
  vals.push(driverId);
  await pool.query(`UPDATE delivery_partners SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
  await pool.query(`UPDATE driver_verifications SET overall_status=$1, last_reviewed_at=now(), last_reviewed_by=$2, updated_at=now() WHERE driver_id=$3`,
    [to, adminActor, driverId]);

  // Record in both audit tables
  await recordAudit({
    actor_type: 'ADMIN', actor_id: adminActor,
    subject_type: 'DRIVER', subject_id: driverId,
    action: action.toUpperCase(), from_state: from, to_state: to,
    note: reason || null,
  });
  await pool.query(
    `INSERT INTO admin_verification_actions (admin_actor, subject_type, subject_id, action, target, reason)
     VALUES ($1,'DRIVER',$2,$3,'OVERALL',$4)`,
    [adminActor, driverId, action, reason || null]);

  return { from, to };
}

async function docDecision(docId, action, adminActor, reason) {
  const { rows: [doc] } = await pool.query(
    `SELECT id, driver_id, doc_type, status FROM driver_documents WHERE id=$1`, [docId]);
  if (!doc) throw new Error('Doc not found');
  const to = action === 'approve' ? 'approved' : 'rejected';
  await pool.query(
    `UPDATE driver_documents SET status=$1, reviewed_at=now(), reviewed_by=$2, rejection_reason=$3 WHERE id=$4`,
    [to, adminActor, reason || null, docId]);
  const col = DOC_TO_COLUMN[doc.doc_type];
  if (col) {
    await pool.query(
      `UPDATE driver_verifications SET ${col}=$1, updated_at=now() WHERE driver_id=$2`,
      [to, doc.driver_id]);
  }
  await pool.query(
    `INSERT INTO admin_verification_actions (admin_actor, subject_type, subject_id, action, target, reason)
     VALUES ($1,'DRIVER',$2,$3,$4,$5)`,
    [adminActor, doc.driver_id, action, doc.doc_type, reason || null]);
  await recordAudit({
    actor_type: 'ADMIN', actor_id: adminActor,
    subject_type: 'DRIVER', subject_id: doc.driver_id,
    action: 'DOC_' + action.toUpperCase(), from_state: doc.status, to_state: to,
    note: `${doc.doc_type}: ${reason || ''}`.trim(),
  });
  return { doc_type: doc.doc_type, from: doc.status, to };
}

async function canGoOnline(driverId) {
  const { rows: [d] } = await pool.query(
    `SELECT verification_status, risk_state FROM delivery_partners WHERE id=$1`, [driverId]);
  if (!d) return { ok: false, reason: 'not_found' };
  if (d.verification_status !== 'approved') return { ok: false, reason: 'verification_status=' + d.verification_status };
  if (d.risk_state === 'SUSPENDED') return { ok: false, reason: 'suspended_by_risk' };
  return { ok: true };
}

module.exports = {
  DOC_TYPES, DOC_STATUSES, OVERALL_STATUSES, DOC_TO_COLUMN,
  getDriverVerification, upsertDocument, submitApplication,
  adminDecision, docDecision, recordAudit, recordRiskEvent, canGoOnline,
};
