import 'package:flutter/foundation.dart';

class ApiConfig {
  static const String _configured = String.fromEnvironment('PVL_API_URL');
  static const String _localWeb = 'http://localhost:5000/api';
  static const String _localAndroid = 'http://10.0.2.2:5000/api';

  static String get baseUrl {
    if (_configured.trim().isNotEmpty) return _configured.trim();
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return _localAndroid;
    }
    return _localWeb;
  }

  static String get socketUrl {
    return baseUrl.replaceAll(RegExp(r'/api/?$'), '');
  }
}