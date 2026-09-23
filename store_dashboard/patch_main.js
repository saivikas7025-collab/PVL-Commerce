const fs = require('fs');
const file = 'lib/main.dart';
let src = fs.readFileSync(file, 'utf8');
let changed = 0;

// ---- 1. Add imports after socket_io_client ----
const importMarker = "import 'package:socket_io_client/socket_io_client.dart' as IO;";
if (!src.includes("import 'screens/pos_screen.dart';")) {
  src = src.replace(
    importMarker,
    importMarker
      + "\nimport 'screens/pos_screen.dart';"
      + "\nimport 'widgets/pvl_logo.dart';"
  );
  changed++;
}

// ---- 2. Replace AppBar title with PvlLogo ----
const oldTitle = "        title: Text(_storeName),";
if (src.includes(oldTitle) && !src.includes("PvlLogo(size: 32")) {
  src = src.replace(
    oldTitle,
    "        title: const PvlLogo(size: 32, showWordmark: true),"
  );
  changed++;
}

// ---- 3. Insert FAB before bottomNavigationBar ----
const bottomNavMarker = "      bottomNavigationBar: NavigationBar(";
if (src.includes(bottomNavMarker) && !src.includes("'pos-fab'")) {
  const fab = [
    "      floatingActionButton: FloatingActionButton.extended(",
    "        heroTag: 'pos-fab',",
    "        onPressed: () {",
    "          Navigator.of(context).push(",
    "            MaterialPageRoute(",
    "              builder: (_) => PosScreen(",
    "                storeId: widget.storeId,",
    "                baseUrl: '\\${ApiConfig.baseUrl}/store-dashboard',",
    "              ),",
    "            ),",
    "          );",
    "        },",
    "        backgroundColor: const Color(0xFF1B5E20),",
    "        foregroundColor: Colors.white,",
    "        icon: const Icon(Icons.add_shopping_cart),",
    "        label: const Text('New Sale'),",
    "      ),",
    ""
  ].join('\n');
  src = src.replace(bottomNavMarker, fab + bottomNavMarker);
  changed++;
}

fs.writeFileSync(file, src);
console.log('Edits applied:', changed);
if (changed < 3) {
  console.log('Note: some edits may have been skipped (already applied or marker missing)');
}
