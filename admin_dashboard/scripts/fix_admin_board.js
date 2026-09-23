const fs = require('fs');
const path = 'lib/screens/dispatch_board_screen.dart';
let src = fs.readFileSync(path, 'utf8');
const before = src;

// setState(() => _future = DispatchBoardApi.liveOrders());
src = src.replace(
  /setState\(\(\) => _future = ([^)]+)\);/g,
  'setState(() { _future = $1; });'
);

fs.writeFileSync(path + '.fix3.bak', before);
fs.writeFileSync(path, src);
console.log('admin dispatch_board_screen patched');
