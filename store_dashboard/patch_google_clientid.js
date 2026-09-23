const fs = require('fs');
const file = 'lib/main.dart';
let src = fs.readFileSync(file, 'utf8');

const oldLine = `      final googleUser = await GoogleSignIn().signIn();`;
const newLine = `      final googleUser = await GoogleSignIn(
        clientId: '955031514909-jq41c9qti9bmnrna9i2fal9n060u4mps.apps.googleusercontent.com',
        scopes: ['email', 'profile'],
      ).signIn();`;

if (!src.includes(oldLine)) {
  console.error('marker not found — is the file already patched?');
  process.exit(1);
}

src = src.replace(oldLine, newLine);
fs.writeFileSync(file, src);
console.log('GoogleSignIn clientId patched');
