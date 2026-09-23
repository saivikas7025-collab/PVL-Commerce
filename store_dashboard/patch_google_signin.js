const fs = require('fs');
const file = 'lib/main.dart';
let src = fs.readFileSync(file, 'utf8');

const oldStart = `  Future<void> _signInWithGoogle() async {
    setState(() { _googleLoading = true; _error = ''; });
    try {
      final googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) { return; }
      final googleAuth = await googleUser.authentication;
      final credential = FA.GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );`;

const newStart = `  static const _googleWebClientId =
      '955031514909-jq41c9qti9bmnrna9i2fal9n060u4mps.apps.googleusercontent.com';

  Future<void> _signInWithGoogle() async {
    setState(() { _googleLoading = true; _error = ''; });
    try {
      // Initialize the web plugin once with an explicit client ID.
      try {
        await GoogleSignIn.instance.initialize(
          clientId: _googleWebClientId,
        );
      } catch (_) {
        // Already initialized or older plugin — ignore
      }

      GoogleSignInAccount? googleUser;
      try {
        googleUser = await GoogleSignIn.instance.authenticate();
      } catch (e) {
        // Fallback to old API if instance flow not available
        googleUser = await GoogleSignIn().signIn();
      }
      if (googleUser == null) { return; }

      final googleAuth = await googleUser.authentication;
      if (googleAuth.idToken == null && googleAuth.accessToken == null) {
        throw Exception('Google did not return an auth token. '
            'Check that the Web client ID in web/index.html matches this project.');
      }

      final credential = FA.GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );`;

if (!src.includes(oldStart)) {
  console.error('old method header not found — main.dart shape differs, aborting');
  process.exit(1);
}

src = src.replace(oldStart, newStart);
fs.writeFileSync(file, src);
console.log('_signInWithGoogle updated');
