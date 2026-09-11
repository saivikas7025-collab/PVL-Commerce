/// Placeholder Google Auth service.
/// Firebase is not yet configured for this project, so this service
/// throws a friendly error if called. Once you set up Firebase and run
/// `flutterfire configure`, replace the body of [signInWithGoogle] with
/// the real Firebase implementation.
class GoogleAuthService {
  static Future<void> signInWithGoogle() async {
    throw Exception(
        'Google Sign-In is not configured yet. Please use Demo Login for now.');
  }

  static Future<void> signOut() async {
    // no-op until Firebase is configured
  }
}