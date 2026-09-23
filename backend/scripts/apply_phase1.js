const fs = require('fs');
const path = require('path');

function replaceBlock(filePath, startMarker, newCode) {
  let src = fs.readFileSync(filePath, 'utf8');
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error('start marker not found in ' + filePath);

  const after = src.slice(start + startMarker.length);
  const m = after.match(/\nrouter\.(get|post|put|patch|delete)\(|\nmodule\.exports/);
  if (!m) throw new Error('end marker not found in ' + filePath);
  const end = start + startMarker.length + m.index + 1;

  src = src.slice(0, start) + newCode.trimEnd() + '\n\n' + src.slice(end);
  fs.writeFileSync(filePath, src);
}

function insertBefore(filePath, marker, newCode) {
  let src = fs.readFileSync(filePath, 'utf8');
  const idx = src.lastIndexOf(marker);
  if (idx === -1) throw new Error('marker not found in ' + filePath);
  src = src.slice(0, idx) + newCode.trimEnd() + '\n\n' + src.slice(idx);
  fs.writeFileSync(filePath, src);
}

// --- 1. Replace the /register handler in storeDashboard.js ---
const newRegister = fs.readFileSync('scripts/new_register_block.js', 'utf8');
replaceBlock('routes/storeDashboard.js', 'router.post("/register"', newRegister);
console.log('storeDashboard.js: /register replaced');

// --- 2. Insert admin endpoints before module.exports in admin.js ---
const newAdmin = fs.readFileSync('scripts/new_admin_endpoints.js', 'utf8');
insertBefore('routes/admin.js', 'module.exports = router', newAdmin);
console.log('admin.js: store-application endpoints inserted');

console.log('\nDone. Backend will auto-restart via nodemon.');
