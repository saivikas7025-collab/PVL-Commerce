const fs = require('fs');
const path = 'routes/admin.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (src.includes('__DRIVE_STREAM_BLOCK__')) {
  console.log('Already present.');
} else {
  const block = `/* __DRIVE_STREAM_BLOCK__ */
const driveSvc = require('../services/googleDrive');

router.get('/drive/:fileId/stream', async (req, res) => {
  try {
    const out = await driveSvc.getFileStream(req.params.fileId);
    res.setHeader('Content-Type', out.mimeType || 'application/octet-stream');
    if (out.size) res.setHeader('Content-Length', out.size);
    res.setHeader('Content-Disposition', 'inline; filename="' + (out.name || 'file') + '"');
    out.stream.pipe(res);
  } catch (e) {
    console.error('[admin drive stream] error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/drive/:fileId/meta', async (req, res) => {
  try {
    const drive = driveSvc.getDrive();
    const meta = await drive.files.get({
      fileId: req.params.fileId,
      fields: 'id, name, mimeType, size, webViewLink, thumbnailLink, createdTime',
      supportsAllDrives: true,
    });
    return res.json({ success: true, file: meta.data });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

`;
  const idx = src.lastIndexOf('module.exports = router');
  if (idx === -1) throw new Error('module.exports not found');
  src = src.slice(0, idx) + block + src.slice(idx);
  console.log('Drive stream block inserted.');
}

fs.writeFileSync(path + '.drive2.bak', before);
fs.writeFileSync(path, src);
console.log('admin.js saved.');
