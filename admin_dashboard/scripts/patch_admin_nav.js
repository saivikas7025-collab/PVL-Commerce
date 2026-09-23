const fs = require('fs');
const path = 'lib/main.dart';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (!src.includes("screens/dispatch_board_screen.dart")) {
  const anchor = "import 'screens/store_applications_screen.dart';";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('store_applications import not found');
  src = src.slice(0, i + anchor.length) +
        "\nimport 'screens/dispatch_board_screen.dart';" +
        src.slice(i + anchor.length);
  console.log('admin: import added');
}

// Add a second FAB — replace the existing extended FAB row with two
if (!src.includes('DispatchBoardScreen()')) {
  const oldFab = src.match(/floatingActionButton: FloatingActionButton\.extended\([\s\S]*?\),\s*\n/);
  if (!oldFab) {
    console.log('admin: FAB block not found. Skipping nav patch. You can add manually.');
  } else {
    const newFab = `floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'dispatch',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DispatchBoardScreen())),
            icon: const Icon(Icons.dispatch),
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
      ),
`;
    src = src.replace(oldFab[0], newFab);
    console.log('admin: FAB swapped to two buttons');
  }
}

fs.writeFileSync(path + '.nav.bak', before);
fs.writeFileSync(path, src);
console.log('admin main.dart saved');
