const fs = require('fs');
const lines = fs.readFileSync('lib/main.dart','utf8').split('\n');
console.log('=== lines 1100-1230 ===');
console.log(lines.slice(1099, 1230).map((l,i)=>String(i+1100).padStart(5)+': '+l).join('\n'));
console.log('\n=== lines 360-410 ===');
console.log(lines.slice(359, 410).map((l,i)=>String(i+360).padStart(5)+': '+l).join('\n'));
