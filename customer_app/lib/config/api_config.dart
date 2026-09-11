import 'package:flutter/foundation.dart';

class ApiConfig {
  // Set this for a deployed backend with:
  // flutter run --dart-define=PVL_API_URL=https://your-api.example.com/api
  static const configuredUrl = String.fromEnvironment('PVL_API_URL');
  static const webUrl = 'http://localhost:5000/api';
  static const androidEmulatorUrl = 'http://10.0.2.2:5000/api';

  static String get baseUrl {
    if (configuredUrl.trim().isNotEmpty) return configuredUrl.trim();
    if (kIsWeb) {
      final origin = Uri.base.origin;
      if (origin.isNotEmpty && origin != 'null' && !origin.contains('localhost')) {
        return '$origin/api';
      }
      return webUrl;
    }
    if (defaultTargetPlatform == TargetPlatform.android)
      return androidEmulatorUrl;
    return webUrl;
  }
}
