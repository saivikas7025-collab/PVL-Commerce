const fs = require('fs');
const file = 'routes/storeDashboard.js';
let src = fs.readFileSync(file, 'utf8');

// Look at what the profile handler currently SELECTs
const idx = src.indexOf('router.get("/profile/:storeId"');
if (idx < 0) { console.error('profile handler not found'); process.exit(1); }
console.log('--- current profile handler (first 40 lines) ---');
console.log(src.split('\n').slice(
  src.slice(0, idx).split('\n').length - 1,
  src.slice(0, idx).split('\n').length + 39
).join('\n'));
