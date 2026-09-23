const fs = require('fs');
const path = 'routes/admin.js';
let src = fs.readFileSync(path, 'utf8');
const marker = 'STORE ONBOARDING';
const firstIdx = src.indexOf(marker);
if (firstIdx === -1) { console.error('marker not found'); process.exit(1); }
const secondIdx = src.indexOf(marker, firstIdx + 1);
if (secondIdx === -1) { console.log('Only one block found — nothing to dedupe.'); process.exit(0); }
const exportsIdx = src.indexOf('module.exports = router', secondIdx);
if (exportsIdx === -1) { console.error('module.exports not found after second block'); process.exit(1); }
const removed = src.slice(secondIdx, exportsIdx);
console.log('Duplicate block: ' + removed.length + ' bytes at offset ' + secondIdx);
fs.writeFileSync(path + '.bak', src);
fs.writeFileSync(path, src.slice(0, secondIdx) + src.slice(exportsIdx));
console.log('Done. Backup saved to routes/admin.js.bak');
