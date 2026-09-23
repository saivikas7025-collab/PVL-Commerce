const fs = require('fs');
const path = 'routes/admin.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

// Replace the require of googleDrive with localStorage
src = src.replace(
  "const driveSvc = require('../services/googleDrive');",
  "const driveSvc = require('../services/localStorage');"
);

// Remove the getDrive-based metadata route (not needed for local storage)
src = src.replace(
  /router\.get\('\/drive\/:fileId\/meta'[\s\S]*?\n\}\);\n/,
  ''
);

fs.writeFileSync(path + '.local.bak', before);
fs.writeFileSync(path, src);
console.log('admin.js updated to use localStorage.');
