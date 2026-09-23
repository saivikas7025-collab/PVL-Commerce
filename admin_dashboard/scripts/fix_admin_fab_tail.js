const fs = require('fs');
const path = 'lib/main.dart';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

const marker = "icon: const Icon(Icons.store),";
const i1 = src.indexOf(marker);
const i2 = src.indexOf(marker, i1 + 1);

if (i2 === -1) {
  console.log('No duplicate marker — file may already be clean');
} else {
  // Walk back to the start of the line containing the second marker
  let cut = i2;
  while (cut > 0 && src[cut - 1] !== '\n') cut--;

  // Find the semicolon that ends this junk block
  const semi = src.indexOf(';', i2);
  if (semi === -1) throw new Error('no ; after junk');

  console.log('Junk starts at', cut, 'ends at', semi);
  console.log('Junk content:', JSON.stringify(src.slice(cut, semi + 1)));

  // Replace junk with proper close: keep the newline at cut, insert "    );\n"
  src = src.slice(0, cut + 1) + "    );\n" + src.slice(semi + 1);
  console.log('Junk removed.');
}

fs.writeFileSync(path + '.tailfix.bak', before);
fs.writeFileSync(path, src);
console.log('Saved. Backup: main.dart.tailfix.bak');
