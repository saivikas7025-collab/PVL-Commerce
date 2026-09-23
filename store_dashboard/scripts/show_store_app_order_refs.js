const fs = require('fs');
const text = fs.readFileSync('lib/main.dart','utf8');
const lines = text.split('\n');
const hits = [];
lines.forEach((l, i) => {
  if (/orders\//i.test(l) || /order\//i.test(l) || /order_items|items\b/i.test(l) || /OrderDetail|OrderList|OrderCard|OrderScreen/i.test(l)) {
    hits.push({ n: i+1, line: l.trim().slice(0, 160) });
  }
});
console.log('\n=== lines mentioning orders / items ===');
for (const h of hits) console.log(String(h.n).padStart(5) + ': ' + h.line);
console.log('\nTotal:', hits.length);
