const fs = require('fs');
const path = 'lib/main.dart';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);

const before = src;

// 1. Make sure our screen is imported
if (!src.includes("screens/store_applications_screen.dart")) {
  const anchor = "import 'config/api_config.dart';";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('api_config import anchor missing');
  src = src.slice(0, i + anchor.length) +
        "\nimport 'screens/store_applications_screen.dart';" +
        src.slice(i + anchor.length);
  console.log('Added import.');
}

// 2. Replace the sidebar body call:  _buildStores(),  =>  const StoreApplicationsScreen(),
const re = /(\n\s+)_buildStores\(\),\s*\n/;
if (!re.test(src)) {
  console.log('WARN: call site pattern not found — printing nearby context for manual fix.');
  const idx = src.indexOf('_buildStores()');
  console.log(src.slice(Math.max(0, idx - 120), idx + 60));
  process.exit(2);
}
src = src.replace(re, (m, indent) => `${indent}const StoreApplicationsScreen(),\n`);
console.log('Replaced sidebar _buildStores() call with StoreApplicationsScreen().');

fs.writeFileSync(path + '.sidebar.bak', before);
fs.writeFileSync(path, src);
console.log('main.dart patched. Backup: lib/main.dart.sidebar.bak');
