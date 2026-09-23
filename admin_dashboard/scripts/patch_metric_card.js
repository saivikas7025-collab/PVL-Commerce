const fs = require('fs');
const path = 'lib/main.dart';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);

const before = src;

const oldRow =
`              Row(
                children: [
                  Icon(icon, color: color),
                  const SizedBox(width: 8),
                  Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey)),
                ],
              ),`;

const newRow =
`              Row(
                children: [
                  Icon(icon, color: color, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
                    ),
                  ),
                ],
              ),`;

if (!src.includes(oldRow)) {
  console.error('Exact Row block not found — file has been edited. Printing candidates:');
  const idx = src.indexOf('Widget _metricCard');
  console.log(src.slice(idx, idx + 700));
  process.exit(1);
}

src = src.replace(oldRow, newRow);
fs.writeFileSync(path + '.overflow.bak', before);
fs.writeFileSync(path, src);
console.log('Patched _metricCard: Expanded + ellipsis. Backup: lib/main.dart.overflow.bak');
