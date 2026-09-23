import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../config/dev_driver_token.dart';

class DriverDispatchApi {
  static String devToken = kDevDriverToken;
  static String get _base => ApiConfig.baseUrl;
  static Map<String, String> _headers() => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $devToken',
  };

  static Future<Map<String, dynamic>> _decode(http.Response r) async {
    Map<String, dynamic> body;
    try { body = jsonDecode(r.body) as Map<String, dynamic>; }
    catch (_) { body = {'success': false, 'message': 'Bad JSON (HTTP ${r.statusCode})'}; }
    if (r.statusCode >= 200 && r.statusCode < 300) return body;
    throw Exception(body['message'] ?? body['error'] ?? 'HTTP ${r.statusCode}');
  }

  static Future<List<Map<String, dynamic>>> inbox(int driverId) async {
    final r = await http.get(Uri.parse('$_base/dispatch/driver/$driverId/inbox'), headers: _headers());
    final b = await _decode(r);
    return ((b['offers'] as List?) ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  static Future<Map<String, dynamic>> accept(int driverId, int orderId) async {
    final r = await http.post(
      Uri.parse('$_base/dispatch/driver/$driverId/orders/$orderId/accept'), headers: _headers());
    return _decode(r);
  }

  static Future<Map<String, dynamic>> reject(int driverId, int orderId, String reason) async {
    final r = await http.post(
      Uri.parse('$_base/dispatch/driver/$driverId/orders/$orderId/reject'),
      headers: _headers(),
      body: jsonEncode({'reason': reason}),
    );
    return _decode(r);
  }
}
