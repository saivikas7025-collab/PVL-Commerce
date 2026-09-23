const fs = require('fs');
const file = 'routes/storeDashboard.js';
let src = fs.readFileSync(file, 'utf8');
const before = `        is_active,
        is_active AS is_online`;
const after = `        is_active,
        is_online`;
if (src.includes(before)) {
  src = src.replace(before, after);
  fs.writeFileSync(file, src);
  console.log('profile handler patched: now returns real is_online');
} else {
  console.log('marker not found — inspect manually');
}
