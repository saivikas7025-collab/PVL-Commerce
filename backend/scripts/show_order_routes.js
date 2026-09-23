const fs = require('fs');
console.log('\n================ storeDashboard.js  /order/:orderId ================');
console.log(fs.readFileSync('routes/storeDashboard.js','utf8').split('\n').slice(253, 310).join('\n'));
console.log('\n================ store.js  /order/:orderId ================');
console.log(fs.readFileSync('routes/store.js','utf8').split('\n').slice(236, 322).join('\n'));
console.log('\n================ storeDashboard.js  /orders/:storeId ================');
console.log(fs.readFileSync('routes/storeDashboard.js','utf8').split('\n').slice(199, 255).join('\n'));
