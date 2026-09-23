const fs = require('fs');
const path = 'services/dispatchEngine.js';
let src = fs.readFileSync(path, 'utf8');
const before = src;

const oldBlock = `      WHERE dp.is_online = TRUE
        AND dp.is_available = TRUE
        AND dp.approval_status = 'approved'
        AND dp.current_latitude IS NOT NULL
        AND dp.current_longitude IS NOT NULL\``;

const newBlock = `      WHERE dp.is_online = TRUE
        AND dp.is_available = TRUE
        AND dp.approval_status = 'approved'
        AND dp.verification_status = 'approved'
        AND dp.risk_state <> 'SUSPENDED'
        AND dp.current_latitude IS NOT NULL
        AND dp.current_longitude IS NOT NULL\``;

if (!src.includes(oldBlock)) {
  console.log('WARN: exact WHERE block not found. Printing context:');
  const idx = src.indexOf('findEligibleDrivers');
  console.log(src.slice(idx, idx + 700));
  process.exit(2);
}

src = src.replace(oldBlock, newBlock);
fs.writeFileSync(path + '.gate.bak', before);
fs.writeFileSync(path, src);
console.log('dispatchEngine.js: driver gate now requires verification_status=approved');
