const fs = require('fs');
const path = 'lib/main.dart';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

// 1. Import
if (!src.includes("screens/store_order_inbox_screen.dart")) {
  const anchor = "import 'package:flutter/material.dart';";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('material import not found');
  const at = i + anchor.length;
  src = src.slice(0, at) + "\nimport 'screens/store_order_inbox_screen.dart';" + src.slice(at);
  console.log('store: import added');
}

// 2. Locate existing FAB inside DashboardPage
const dashIdx = src.indexOf('class _DashboardPageState');
if (dashIdx === -1) throw new Error('_DashboardPageState not found');

const fabLabel = 'floatingActionButton: FloatingActionButton.extended(';
const fabIdx = src.indexOf(fabLabel, dashIdx);
if (fabIdx === -1) throw new Error('FAB not found after _DashboardPageState');
if (src.indexOf('StoreOrderInboxScreen()', dashIdx) !== -1 && src.indexOf('StoreOrderInboxScreen()', dashIdx) < fabIdx + 500) {
  console.log('store: already patched, skipping');
} else {
  // find the '(' of FloatingActionButton.extended and paren-match
  const callOpen = fabIdx + 'floatingActionButton: FloatingActionButton.extended'.length;
  if (src[callOpen] !== '(') throw new Error('expected ( after FloatingActionButton.extended');

  let depth = 0, closeIdx = -1;
  for (let j = callOpen; j < src.length; j++) {
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
  if (closeIdx === -1) throw new Error('FAB close paren not found');

  // Original FAB call text (WITHOUT the surrounding 'floatingActionButton: ' prefix and trailing comma)
  const origCall = src.slice(callOpen, closeIdx + 1); // "(...)" including outer parens

  // Try to add heroTag to the existing FAB so both coexist
  let origBody = origCall.slice(1, -1); // strip outer parens
  if (!origBody.includes('heroTag')) {
    origBody = "\n        heroTag: 'pos',\n      " + origBody.trimStart();
  }

  const replacement = `Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'inbox',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StoreOrderInboxScreen(storeId: 1))),
            icon: const Icon(Icons.inbox),
            label: const Text('Inbox'),
          ),
          const SizedBox(height: 8),
          FloatingActionButton.extended(${origBody}),
        ],
      )`;

  src = src.slice(0, callOpen) + replacement + src.slice(closeIdx + 1);
  console.log('store: FAB wrapped in Column with Inbox + POS');
}

fs.writeFileSync(path + '.inbox.bak', before);
fs.writeFileSync(path, src);
console.log('store main.dart saved');
