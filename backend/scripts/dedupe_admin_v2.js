const fs = require('fs');
const path = 'routes/admin.js';
let src = fs.readFileSync(path, 'utf8');

// Strip BOM characters everywhere (leading or mid-file)
const BOM = '\uFEFF';
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
src = src.split(BOM).join('');

// Locate the two STORE ONBOARDING blocks
const marker = 'STORE ONBOARDING';
const firstIdx = src.indexOf(marker);
if (firstIdx === -1) { console.error('marker not found'); process.exit(1); }
const secondIdx = src.indexOf(marker, firstIdx + 1);

if (secondIdx === -1) {
  console.log('Only one block found. Stripping BOMs and saving.');
  fs.writeFileSync(path, src);
  process.exit(0);
}

// Walk backward to the /* opener that precedes the second block
const blockStart = src.lastIndexOf('/* ===', secondIdx);
if (blockStart === -1) { console.error('comment opener not found'); process.exit(1); }

// Find module.exports after blockStart
const exportsIdx = src.indexOf('module.exports = router', blockStart);
if (exportsIdx === -1) { console.error('module.exports not found'); process.exit(1); }

const removed = src.slice(blockStart, exportsIdx);
console.log('Removing ' + removed.length + ' chars from offset ' + blockStart);
fs.writeFileSync(path + '.bak2', src);
fs.writeFileSync(path, src.slice(0, blockStart) + src.slice(exportsIdx));
console.log('Dedupe complete.');
