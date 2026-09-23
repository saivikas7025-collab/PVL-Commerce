const fs = require('fs');
const path = 'server.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (!src.includes("routes/uploads")) {
  const anchor = "const driverKycRoutes = require('./routes/driverKyc');";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('driverKyc require not found');
  const at = i + anchor.length;
  src = src.slice(0, at) + "\nconst uploadRoutes = require('./routes/uploads');" + src.slice(at);
  console.log('Added require.');
}
if (!src.includes("app.use('/api/uploads'")) {
  const anchor = "app.use('/api/driver-kyc'";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('driver-kyc mount not found');
  const nl = src.indexOf('\n', i);
  src = src.slice(0, nl + 1) + "app.use('/api/uploads', uploadRoutes);\n" + src.slice(nl + 1);
  console.log('Mounted /api/uploads.');
}

fs.writeFileSync(path + '.uploads.bak', before);
fs.writeFileSync(path, src);
console.log('server.js patched.');
