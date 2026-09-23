require('dotenv').config({ quiet: true });
const { pool } = require('../db');
const svc = require('../services/verificationService');

(async () => {
  try {
    console.log('=== Driver 1 state ===');
    const d = await svc.getDriverVerification(1);
    console.log('  verification_status:', d.driver.verification_status);
    console.log('  risk_state:', d.driver.risk_state);
    console.log('  doc count:', d.documents.length);

    console.log('\n=== canGoOnline ===');
    console.log(' ', await svc.canGoOnline(1));

    console.log('\n=== Submit a DL document ===');
    const doc = await svc.upsertDocument(1, {
      doc_type: 'DL', doc_number: 'TS09-2020-12345',
      front_url: 'https://example.com/dl-front.jpg',
      back_url: 'https://example.com/dl-back.jpg',
      expiry_date: '2030-12-31',
    });
    console.log('  doc id:', doc.id, '| type:', doc.doc_type, '| status:', doc.status);

    console.log('\n=== Submit application for review ===');
    await svc.submitApplication(1);
    const after = await svc.getDriverVerification(1);
    console.log('  now:', after.driver.verification_status);

    console.log('\n=== Admin approve ===');
    const r = await svc.adminDecision(1, 'approve', 'admin@test', 'Docs look good');
    console.log(' ', r);

    console.log('\n=== canGoOnline again ===');
    console.log(' ', await svc.canGoOnline(1));

    console.log('\n=== Audit trail ===');
    const { rows: audit } = await pool.query(
      `SELECT actor_type, action, from_state, to_state, note FROM verification_audit_logs
        WHERE subject_type='DRIVER' AND subject_id=1 ORDER BY id DESC LIMIT 5`);
    for (const a of audit) console.log(' ', a);
  } catch (e) {
    console.error('TEST ERROR:', e.message);
    process.exitCode = 1;
  } finally { await pool.end(); }
})();
