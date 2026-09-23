const fs = require('fs');
const lines = fs.readFileSync('routes/storeDashboard.js','utf8').split('\n');
const idx = lines.findIndex(l => l.includes('toggle-online'));
if (idx < 0) { console.log('handler not found'); process.exit(0); }
console.log(lines.slice(idx, idx + 50).map((l,i)=>String(i+idx+1).padStart(5)+': '+l).join('\n'));
