const fs = require('fs');
const path = 'lib/main.dart';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

const bad = 'FloatingActionButton.extendedColumn(';
if (!src.includes(bad)) {
  console.log('Nothing to fix — bad pattern not found');
  process.exit(0);
}

src = src.replace(bad, 'Column(');
console.log('Fixed: FloatingActionButton.extendedColumn → Column');

// Also sanity: ensure the store_order_inbox import is present
if (!src.includes("screens/store_order_inbox_screen.dart")) {
  const anchor = "import 'package:flutter/material.dart';";
  const i = src.indexOf(anchor);
  if (i !== -1) {
    src = src.slice(0, i + anchor.length) + "\nimport 'screens/store_order_inbox_screen.dart';" + src.slice(i + anchor.length);
    console.log('Added store_order_inbox import.');
  }
}

fs.writeFileSync(path + '.fix2.bak', before);
fs.writeFileSync(path, src);
console.log('Saved. Backup: main.dart.fix2.bak');
