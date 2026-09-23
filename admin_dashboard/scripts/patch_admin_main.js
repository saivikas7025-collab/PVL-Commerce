const fs = require('fs');
const path = 'lib/main.dart';
const original = fs.readFileSync(path, 'utf8');
let src = original;
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);

// 5a. Add import
if (!src.includes("screens/store_applications_screen.dart")) {
  const anchor = "import 'config/api_config.dart';";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('api_config import not found');
  src = src.slice(0, i + anchor.length) +
        "\nimport 'screens/store_applications_screen.dart';" +
        src.slice(i + anchor.length);
  console.log('Added import.');
} else {
  console.log('Import already present.');
}

// 5b. Add FAB to AdminDashboard Scaffold
const classMarker = 'class _AdminDashboardState';
const classIdx = src.indexOf(classMarker);
if (classIdx === -1) throw new Error('AdminDashboard not found');

const buildIdx = src.indexOf('Widget build(BuildContext context)', classIdx);
if (buildIdx === -1) throw new Error('build method not found');

const scaffoldIdx = src.indexOf('Scaffold(', buildIdx);
if (scaffoldIdx === -1) throw new Error('Scaffold not found');

const openParen = scaffoldIdx + 'Scaffold'.length;
if (src[openParen] !== '(') throw new Error('expected ( after Scaffold');

// paren-match respecting simple strings
let depth = 0, closeIdx = -1;
for (let j = openParen; j < src.length; j++) {
  const ch = src[j];
  if (ch === "'" || ch === '"') {
    const q = ch; j++;
    while (j < src.length && src[j] !== q) {
      if (src[j] === '\\') j++;
      j++;
    }
    continue;
  }
  if (ch === '/' && src[j+1] === '/') {
    while (j < src.length && src[j] !== '\n') j++;
    continue;
  }
  if (ch === '(') depth++;
  else if (ch === ')') { depth--; if (depth === 0) { closeIdx = j; break; } }
}
if (closeIdx === -1) throw new Error('closing paren of Scaffold not found');

const body = src.slice(openParen, closeIdx);
if (body.includes('floatingActionButton:')) {
  console.log('FAB already present - skipping.');
} else {
  const fab = "\n      floatingActionButton: FloatingActionButton.extended(\n" +
              "        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StoreApplicationsScreen())),\n" +
              "        icon: const Icon(Icons.store),\n" +
              "        label: const Text('Stores'),\n" +
              "      ),";
  src = src.slice(0, closeIdx) + fab + src.slice(closeIdx);
  console.log('Inserted FAB.');
}

fs.writeFileSync(path + '.prefab.bak', original);
fs.writeFileSync(path, src);
console.log('main.dart patched. Backup: lib/main.dart.prefab.bak');