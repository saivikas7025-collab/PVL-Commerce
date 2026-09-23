const express = require('express');
const router = express.Router();
const svc = require('../services/verificationService');

// GET full KYC state for a driver
router.get('/:driverId/status', async (req, res) => {
  try {
    const d = await svc.getDriverVerification(Number(req.params.driverId));
    if (!d) return res.status(404).json({ success: false, message: 'Driver not found' });
    return res.json({ success: true, ...d });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// Submit one document
router.post('/:driverId/document', async (req, res) => {
  try {
    const doc = await svc.upsertDocument(Number(req.params.driverId), req.body || {});
    return res.json({ success: true, document: doc });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});

// Submit a live selfie check (dev stub — records row, real provider wired in KYC-5)
router.post('/:driverId/selfie', async (req, res) => {
  const driverId = Number(req.params.driverId);
  const { live_selfie_url, check_type } = req.body || {};
  try {
    const { pool } = require('../db');
    const { rows: [c] } = await pool.query(
      `INSERT INTO driver_identity_checks
         (driver_id, check_type, live_selfie_url, provider, result, reason)
       VALUES ($1,$2,$3,'dev-stub','PASS','stub pass — provider to be integrated') RETURNING *`,
      [driverId, check_type || 'LOGIN', live_selfie_url || null]);
    await svc.recordAudit({
      actor_type: 'DRIVER', actor_id: String(driverId),
      subject_type: 'DRIVER', subject_id: driverId,
      action: 'SELFIE_CHECK', from_state: null, to_state: 'PASS',
      note: 'Selfie check (dev stub)',
    });
    return res.json({ success: true, check: c });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// Register a device (called on login)
router.post('/:driverId/device', async (req, res) => {
  const driverId = Number(req.params.driverId);
  const { fingerprint, name, platform } = req.body || {};
  if (!fingerprint) return res.status(400).json({ success: false, message: 'fingerprint required' });
  try {
    const { pool } = require('../db');
    const { rows: [existing] } = await pool.query(
      `SELECT id FROM driver_devices WHERE driver_id=$1 AND device_fingerprint=$2`,
      [driverId, fingerprint]);
    if (existing) {
      await pool.query(`UPDATE driver_devices SET last_seen_at=now() WHERE id=$1`, [existing.id]);
      return res.json({ success: true, device_id: existing.id, new_device: false });
    }
    const { rows: [d] } = await pool.query(
      `INSERT INTO driver_devices (driver_id, device_fingerprint, device_name, platform)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [driverId, fingerprint, name || null, platform || null]);
    // Risk event: new device
    await svc.recordRiskEvent(driverId, 'NEW_DEVICE', 'medium', { device_id: d.id, name: name || null, platform: platform || null });
    return res.json({ success: true, device_id: d.id, new_device: true });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// Mark application as submitted for review
router.post('/:driverId/submit', async (req, res) => {
  try {
    await svc.submitApplication(Number(req.params.driverId));
    return res.json({ success: true });
  } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
});

// Can this driver go online?
router.get('/:driverId/can-go-online', async (req, res) => {
  try {
    const r = await svc.canGoOnline(Number(req.params.driverId));
    return res.json({ success: true, ...r });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
