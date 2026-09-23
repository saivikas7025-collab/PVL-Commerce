const fs = require('fs');
const path = 'lib/main.dart';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

// Find the block that starts with "floatingActionButton: Column(" near the AdminDashboard class
const clsIdx = src.indexOf('class _AdminDashboardState');
if (clsIdx === -1) throw new Error('class not found');

const fabStart = src.indexOf('floatingActionButton:', clsIdx);
if (fabStart === -1) throw new Error('floatingActionButton not found');

// Find the '(' that opens the Column
const colIdx = src.indexOf('Column(', fabStart);
if (colIdx === -1) throw new Error('Column not found');
const openParen = colIdx + 'Column'.length;

// paren-match from Column(
let depth = 0, closeIdx = -1;
for (let j = openParen; j < src.length; j++) {
  const ch = src[j];
  if (ch === "'" || ch === '"') {
    const q = ch; j++;
    while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; }
    continue;
  }
  if (ch === '/' && src[j+1] === '/') { while (j < src.length && src[j] !== '\n') j++; continue; }
  if (ch === '(') depth++;
  else if (ch === ')') { depth--; if (depth === 0) { closeIdx = j; break; } }
}
if (closeIdx === -1) throw new Error('Column close paren not found');

// What follows closeIdx? Check if there's a stray `),` from the original FAB
let endIdx = closeIdx + 1;
// Skip any trailing junk: `),`, `)`, whitespace, until we hit a comma or newline before next Scaffold param
// We'll look ahead for the next scaffold-param style line, e.g. "  ),\n}" or "  bottomNavigationBar"
const tailSlice = src.slice(endIdx, endIdx + 40);
console.log('chars after Column close:', JSON.stringify(tailSlice));

// Detect and consume the stray ")," or ")" pattern that shouldn't be there
// Original broken snippet was: ...),);  — Column close is `)`, then `,` `)` `;` — we consume the extra `)` and any `,`
let consumeEnd = endIdx;
// skip whitespace
while (consumeEnd < src.length && /\s/.test(src[consumeEnd])) consumeEnd++;
// consume stray commas + parens that don't belong (up to 3 chars)
let guards = 0;
while (guards < 4 && consumeEnd < src.length && (src[consumeEnd] === ')' || src[consumeEnd] === ',')) {
  // We expect the real structure to have a comma after the FAB block, so keep ONE comma and stop
  if (src[consumeEnd] === ',') { consumeEnd++; break; }
  consumeEnd++;
  guards++;
  while (consumeEnd < src.length && /\s/.test(src[consumeEnd])) consumeEnd++;
}

const cleanFab = `floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'dispatch',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DispatchBoardScreen())),
            icon: const Icon(Icons.alt_route),
            label: const Text('Dispatch'),
          ),
          const SizedBox(height: 8),
          FloatingActionButton.extended(
            heroTag: 'stores',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StoreApplicationsScreen())),
            icon: const Icon(Icons.store),
            label: const Text('Stores'),
          ),
        ],
      ),`;

src = src.slice(0, fabStart) + cleanFab + src.slice(consumeEnd);

fs.writeFileSync(path + '.fabfix.bak', before);
fs.writeFileSync(path, src);
console.log('admin FAB replaced cleanly. backup: main.dart.fabfix.bak');
