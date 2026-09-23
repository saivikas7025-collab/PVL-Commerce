const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const drive = require('../services/googleDrive');
const { pool } = require('../db');

const ALLOWED_MIME = ['image/jpeg','image/jpg','image/png','image/heic','image/heif','application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type: ' + file.mimetype));
    }
    cb(null, true);
  },
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const driverId = (req.body.driver_id || 'unknown').toString().slice(0, 30);
    const docType = (req.body.doc_type || 'DOC').toString().toUpperCase().slice(0, 30);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const origExt = path.extname(req.file.originalname) || '.bin';
    const displayName = `driver-${driverId}_${docType}_${ts}${origExt}`;

    // Look up driver name for folder naming
    let driverName = null;
    if (driverId !== 'unknown') {
      try {
        const { rows } = await pool.query(
          `SELECT full_legal_name FROM delivery_partners WHERE id=$1`, [driverId]);
        if (rows.length && rows[0].full_legal_name) driverName = rows[0].full_legal_name;
      } catch (_) { /* ignore */ }
    }

    const out = await drive.uploadBuffer(req.file.buffer, displayName, req.file.mimetype, {
      driverId,
      driverName,
    });

    return res.json({ success: true, file: out });
  } catch (e) {
    console.error('[uploads] error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
