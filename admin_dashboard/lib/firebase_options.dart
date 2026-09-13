// PVL Commerce - Firebase options
// Generated from Firebase Console config for project "pvl-commerce".
// Contains public identifiers only (safe to commit).

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for iOS yet.',
        );
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macOS yet.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for Windows yet.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for Linux yet.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAi2iNBGECcdtVNEHFqwJCnkBs0P_23YC8',
    appId: '1:955031514909:web:ff4837b1446cac7f06fbf4',
    messagingSenderId: '955031514909',
    projectId: 'pvl-commerce',
    authDomain: 'pvl-commerce.firebaseapp.com',
    storageBucket: 'pvl-commerce.firebasestorage.app',
    measurementId: 'G-J9Y2V50DSL',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCCF8BvHS1QmAzuv6ypnRZcooFgJNTwFp0',
    appId: '1:955031514909:android:d83c994f154ba77a06fbf4',
    messagingSenderId: '955031514909',
    projectId: 'pvl-commerce',
    storageBucket: 'pvl-commerce.firebasestorage.app',
  );
}
