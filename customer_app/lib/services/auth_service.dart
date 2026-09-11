import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class AuthService {
  static const _token = 'pvl_auth_token', _userId = 'pvl_user_id';

  static Future<String?> getToken() async =>
      (await SharedPreferences.getInstance()).getString(_token);

  static Future<void> saveToken(String token) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_token, token);
  }

  static Future<void> saveUserId(dynamic id) async {
    final p = await SharedPreferences.getInstance();
    final int userId = int.tryParse('$id') ?? 0;
    if (userId > 0) await p.setInt(_userId, userId);
  }

  static Future<void> _save(Map<String, dynamic> data) async {
    final t = data['token']?.toString();
    if (t == null || t.isEmpty)
      throw const ApiException(
        'Server did not return an authentication token.',
      );
    final u = data['user'];
    await saveToken(t);
    if (u is Map && u['id'] != null) await saveUserId(u['id']);
  }

  static Future<Map<String, dynamic>> login({
    required String phone,
    required String password,
  }) async {
    final d = Map<String, dynamic>.from(
      await ApiClient.post('/auth/login', {
        'phone': phone.trim(),
        'password': password,
      }) as Map,
    );
    await _save(d);
    return d;
  }

  static Future<Map<String, dynamic>> sendOtp({required String phone}) async =>
      Map<String, dynamic>.from(
        await ApiClient.post('/auth/send-otp', {'phone': phone.trim()}) as Map,
      );

  static Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    final d = Map<String, dynamic>.from(
      await ApiClient.post('/auth/verify-otp', {
        'phone': phone.trim(),
        'otp': otp.trim(),
      }) as Map,
    );
    if (d['token'] != null) await _save(d);
    return d;
  }

  static Future<Map<String, dynamic>> signup({
    required String name,
    required String phone,
    required String email,
    required String password,
    required String otp,
  }) async {
    final d = Map<String, dynamic>.from(
      await ApiClient.post('/auth/signup', {
        'name': name.trim(),
        'phone': phone.trim(),
        'email': email.trim(),
        'password': password,
        'otp': otp.trim(),
      }) as Map,
    );
    await _save(d);
    return d;
  }

  static Future<bool> validateSession() async {
    final t = await getToken();
    if (t == null || t.isEmpty) return false;
    try {
      final d = await ApiClient.get('/auth/me', token: t);
      return d is Map && d['success'] == true && d['user'] != null;
    } catch (_) {
      await logoutLocal();
      return false;
    }
  }

  static Future<void> logoutLocal() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_token);
    await p.remove(_userId);
  }

  static Future<void> logout() async {
    final t = await getToken();
    if (t != null) {
      try {
        await ApiClient.post('/auth/logout', {}, token: t);
      } catch (_) {}
    }
    await logoutLocal();
  }
}