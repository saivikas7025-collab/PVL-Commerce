const fs = require('fs');
const path = 'routes/admin.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

src = src.replace(
  "const driveSvc = require('../services/localStorage');",
  "const driveSvc = require('../services/googleDrive');"
);

fs.writeFileSync(path + '.drive-oauth.bak', before);
fs.writeFileSync(path, src);
console.log('admin.js now imports googleDrive (OAuth) for streaming.');
