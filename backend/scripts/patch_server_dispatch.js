const fs = require('fs');
const path = 'server.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (!src.includes("require('./routes/dispatch')")) {
  const anchor = "const adminRoutes = require('./routes/admin');";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('anchor not found');
  const at = i + anchor.length;
  src = src.slice(0, at) + "\nconst dispatchRoutes = require('./routes/dispatch');" + src.slice(at);
  console.log('Added require.');
}

if (!src.includes("app.use('/api/dispatch'")) {
  const anchor = "app.use('/api/admin'";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('admin mount not found');
  const nl = src.indexOf('\n', i);
  src = src.slice(0, nl + 1) + "app.use('/api/dispatch', dispatchRoutes);\n" + src.slice(nl + 1);
  console.log('Mounted /api/dispatch.');
}

fs.writeFileSync(path + '.dispatch.bak', before);
fs.writeFileSync(path, src);
console.log('server.js patched.');
