const fs = require('fs');
const file = 'routes/storeDashboard.js';
let src = fs.readFileSync(file, 'utf8');

let count = 0;

// Toggle handler: is_active -> is_online
const oldToggle = `      UPDATE stores
      SET is_active = $1
      WHERE id = $2
      RETURNING id, is_active`;
const newToggle = `      UPDATE stores
      SET is_online = $1
      WHERE id = $2
      RETURNING id, is_online`;
if (src.includes(oldToggle)) { src = src.replace(oldToggle, newToggle); count++; }

const oldResp = `      online: result.rows[0].is_active,`;
const newResp = `      online: result.rows[0].is_online,`;
if (src.includes(oldResp)) { src = src.replace(oldResp, newResp); count++; }

fs.writeFileSync(file, src);
console.log('Toggle handler patches applied:', count);
