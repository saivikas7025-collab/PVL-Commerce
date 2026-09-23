const fs = require('fs');
const path = 'server.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (!src.includes("routes/driverKyc")) {
  const anchor = "const dispatchRoutes = require('./routes/dispatch');";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('dispatch require not found');
  const at = i + anchor.length;
  src = src.slice(0, at) + "\nconst driverKycRoutes = require('./routes/driverKyc');" + src.slice(at);
  console.log('Added require.');
}
if (!src.includes("app.use('/api/driver-kyc'")) {
  const anchor = "app.use('/api/dispatch'";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('dispatch mount not found');
  const nl = src.indexOf('\n', i);
  src = src.slice(0, nl + 1) + "app.use('/api/driver-kyc', driverKycRoutes);\n" + src.slice(nl + 1);
  console.log('Mounted /api/driver-kyc.');
}

fs.writeFileSync(path + '.kyc.bak', before);
fs.writeFileSync(path, src);
console.log('server.js patched.');
