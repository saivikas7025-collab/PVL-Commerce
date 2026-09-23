const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function safeExt(originalName) {
  const e = (path.extname(originalName) || '').toLowerCase();
  return /^[.][a-z0-9]{1,8}$/.test(e) ? e : '.bin';
}

async function uploadBuffer(buffer, filename, mimeType) {
  const ext = safeExt(filename);
  const id = crypto.randomBytes(8).toString('hex');
  const storedName = id + ext;
  const fullPath = path.join(UPLOAD_DIR, storedName);
  await fs.promises.writeFile(fullPath, buffer);

  return {
    fileId: storedName,
    name: filename,
    mimeType: mimeType || 'application/octet-stream',
    size: buffer.length,
    webViewLink: '/api/admin/drive/' + storedName + '/stream',
    createdTime: new Date().toISOString(),
  };
}

function getFileStream(fileId) {
  // Prevent path traversal
  const base = path.basename(fileId);
  const fullPath = path.join(UPLOAD_DIR, base);
  if (!fullPath.startsWith(UPLOAD_DIR)) throw new Error('Invalid path');
  if (!fs.existsSync(fullPath)) throw new Error('File not found');

  const stat = fs.statSync(fullPath);
  const ext = path.extname(base).toLowerCase();
  const mime = ({
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
  })[ext] || 'application/octet-stream';

  return {
    stream: fs.createReadStream(fullPath),
    mimeType: mime,
    size: stat.size,
    name: base,
  };
}

async function deleteFile(fileId) {
  const base = path.basename(fileId);
  const fullPath = path.join(UPLOAD_DIR, base);
  if (!fullPath.startsWith(UPLOAD_DIR)) throw new Error('Invalid path');
  if (fs.existsSync(fullPath)) await fs.promises.unlink(fullPath);
}

module.exports = { uploadBuffer, getFileStream, deleteFile, UPLOAD_DIR };
