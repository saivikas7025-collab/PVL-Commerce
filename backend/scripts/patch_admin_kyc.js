const fs = require('fs');
const path = 'routes/admin.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (src.includes('__DRIVER_KYC_ADMIN_BLOCK__')) {
  console.log('Admin KYC block already present — skipping.');
} else {
  const block = `/* __DRIVER_KYC_ADMIN_BLOCK__ */
const svcKyc = require('../services/verificationService');

// Queue
router.get('/driver-applications', async (req, res) => {
  const status = String(req.query.status || 'pending');
  try {
    const { rows } = await pool.query(\`
      SELECT d.id, d.user_id, d.full_legal_name, d.email,
             d.vehicle_type, d.vehicle_number,
             d.verification_status, d.risk_state,
             d.submitted_at, d.approved_at, d.approved_by,
             (SELECT COUNT(*)::int FROM driver_documents WHERE driver_id=d.id) AS doc_count,
             (SELECT COUNT(*)::int FROM driver_documents WHERE driver_id=d.id AND status='pending') AS pending_docs
        FROM delivery_partners d
       WHERE ($1 = 'all' OR d.verification_status = $1)
       ORDER BY d.submitted_at DESC NULLS LAST, d.id DESC
       LIMIT 200\`, [status]);
    return res.json({ success: true, drivers: rows });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// Detail
router.get('/driver-applications/:id', async (req, res) => {
  try {
    const d = await svcKyc.getDriverVerification(Number(req.params.id));
    if (!d) return res.status(404).json({ success: false, message: 'Not found' });
    const { rows: history } = await pool.query(
      \`SELECT actor_type, actor_id, action, from_state, to_state, note, created_at
         FROM verification_audit_logs
        WHERE subject_type='DRIVER' AND subject_id=$1
        ORDER BY id DESC LIMIT 50\`, [Number(req.params.id)]);
    return res.json({ success: true, ...d, history });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// Actions
router.post('/driver-applications/:id/approve', async (req, res) => {
  try {
    const r = await svcKyc.adminDecision(Number(req.params.id), 'approve', (req.body && req.body.actor) || 'admin', (req.body && req.body.note) || null);
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});
router.post('/driver-applications/:id/reject', async (req, res) => {
  try {
    const reason = (req.body && req.body.reason) || '';
    if (!reason) return res.status(400).json({ success: false, message: 'reason required' });
    const r = await svcKyc.adminDecision(Number(req.params.id), 'reject', (req.body && req.body.actor) || 'admin', reason);
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});
router.post('/driver-applications/:id/request-info', async (req, res) => {
  try {
    const note = (req.body && req.body.note) || '';
    if (!note) return res.status(400).json({ success: false, message: 'note required' });
    const r = await svcKyc.adminDecision(Number(req.params.id), 'request-info', (req.body && req.body.actor) || 'admin', note);
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});
router.post('/driver-applications/:id/suspend', async (req, res) => {
  try {
    const r = await svcKyc.adminDecision(Number(req.params.id), 'suspend', (req.body && req.body.actor) || 'admin', (req.body && req.body.reason) || null);
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});
router.post('/driver-applications/:id/unsuspend', async (req, res) => {
  try {
    const r = await svcKyc.adminDecision(Number(req.params.id), 'unsuspend', (req.body && req.body.actor) || 'admin', null);
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});

// Per-document review
router.post('/driver-documents/:docId/approve', async (req, res) => {
  try {
    const r = await svcKyc.docDecision(Number(req.params.docId), 'approve', (req.body && req.body.actor) || 'admin', null);
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});
router.post('/driver-documents/:docId/reject', async (req, res) => {
  try {
    const reason = (req.body && req.body.reason) || '';
    if (!reason) return res.status(400).json({ success: false, message: 'reason required' });
    const r = await svcKyc.docDecision(Number(req.params.docId), 'reject', (req.body && req.body.actor) || 'admin', reason);
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});

`;

  const idx = src.lastIndexOf('module.exports = router');
  if (idx === -1) throw new Error('module.exports not found');
  src = src.slice(0, idx) + block + src.slice(idx);
  console.log('Admin KYC block inserted.');
}

fs.writeFileSync(path + '.kyc.bak', before);
fs.writeFileSync(path, src);
console.log('admin.js saved.');
