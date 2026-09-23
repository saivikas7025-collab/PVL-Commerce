const fs = require('fs');
const path = 'lib/screens/store_order_inbox_screen.dart';
let src = fs.readFileSync(path, 'utf8');
const before = src;

src = src.replace(
  /setState\(\(\) => _future = ([^)]+)\);/g,
  'setState(() { _future = $1; });'
);

fs.writeFileSync(path + '.fix3.bak', before);
fs.writeFileSync(path, src);
console.log('store_order_inbox_screen patched');
