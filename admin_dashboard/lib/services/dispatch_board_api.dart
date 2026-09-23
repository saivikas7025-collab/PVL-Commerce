import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../config/dev_admin_token.dart';

class DispatchBoardApi {
  static String devToken = kDevAdminToken;
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

  static Future<List<Map<String, dynamic>>> liveOrders() async {
    final r = await http.get(Uri.parse('$_base/dispatch/live'), headers: _headers());
    final b = await _decode(r);
    return ((b['orders'] as List?) ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  static Future<Map<String, dynamic>> orderDetail(int orderId) async {
    final r = await http.get(Uri.parse('$_base/dispatch/order/$orderId'), headers: _headers());
    return _decode(r);
  }

  static Future<Map<String, dynamic>> reassignStore(int orderId, int storeId) async {
    final r = await http.post(
      Uri.parse('$_base/dispatch/admin/$orderId/reassign-store'),
      headers: _headers(),
      body: jsonEncode({'storeId': storeId, 'actor': 'admin@flutter'}),
    );
    return _decode(r);
  }

  static Future<Map<String, dynamic>> reassignDriver(int orderId, int driverId) async {
    final r = await http.post(
      Uri.parse('$_base/dispatch/admin/$orderId/reassign-driver'),
      headers: _headers(),
      body: jsonEncode({'driverId': driverId, 'actor': 'admin@flutter'}),
    );
    return _decode(r);
  }

  static Future<Map<String, dynamic>> config() async {
    final r = await http.get(Uri.parse('$_base/dispatch/config'), headers: _headers());
    return _decode(r);
  }
}
