import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../config/dev_admin_token.dart';

class AdminApi {
  static String devAdminToken = kDevAdminToken;
  static String get _base => ApiConfig.baseUrl;

  static Map<String, String> _headers() {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (devAdminToken.isNotEmpty) h['Authorization'] = 'Bearer $devAdminToken';
    return h;
  }

  static Future<Map<String, dynamic>> _decode(http.Response r) async {
    Map<String, dynamic> body;
    try { body = jsonDecode(r.body) as Map<String, dynamic>; }
    catch (_) { body = {'success': false, 'message': 'Invalid JSON (HTTP ${r.statusCode})'}; }
    if (r.statusCode >= 200 && r.statusCode < 300) return body;
    throw AdminApiException(r.statusCode,
        (body['message'] ?? body['error'] ?? 'HTTP ${r.statusCode}').toString());
  }

  // ---------- Store applications ----------
  static Future<List<Map<String, dynamic>>> listApplications({String status = 'pending'}) async {
    final r = await http.get(
      Uri.parse('$_base/admin/store-applications?status=$status'),
      headers: _headers(),
    );
    final body = await _decode(r);
    final list = (body['stores'] as List?) ?? const [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  static Future<Map<String, dynamic>> getApplication(int id) async {
    final r = await http.get(
      Uri.parse('$_base/admin/store-applications/$id'),
      headers: _headers(),
    );
    return _decode(r);
  }

  static Future<void> approve(int id, {String actor = 'admin', String? note}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/store-applications/$id/approve'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{
        'actor': actor, if (note != null && note.isNotEmpty) 'note': note,
      }),
    );
    await _decode(r);
  }

  static Future<void> reject(int id, {required String reason, String actor = 'admin'}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/store-applications/$id/reject'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{'actor': actor, 'reason': reason}),
    );
    await _decode(r);
  }

  static Future<void> requestInfo(int id, {required String note, String actor = 'admin'}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/store-applications/$id/request-info'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{'actor': actor, 'note': note}),
    );
    await _decode(r);
  }

  // ---------- Driver KYC ----------
  static Future<List<Map<String, dynamic>>> listDriverApplications({String status = 'all'}) async {
    final r = await http.get(
      Uri.parse('$_base/admin/driver-applications?status=$status'),
      headers: _headers(),
    );
    final body = await _decode(r);
    final list = (body['drivers'] as List?) ?? const [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  static Future<Map<String, dynamic>> getDriverApplication(int id) async {
    final r = await http.get(
      Uri.parse('$_base/admin/driver-applications/$id'),
      headers: _headers(),
    );
    return _decode(r);
  }

  static Future<void> approveDriver(int id, {String actor = 'admin', String? note}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/driver-applications/$id/approve'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{
        'actor': actor, if (note != null && note.isNotEmpty) 'note': note,
      }),
    );
    await _decode(r);
  }

  static Future<void> rejectDriver(int id, {required String reason, String actor = 'admin'}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/driver-applications/$id/reject'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{'actor': actor, 'reason': reason}),
    );
    await _decode(r);
  }

  static Future<void> requestDriverInfo(int id, {required String note, String actor = 'admin'}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/driver-applications/$id/request-info'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{'actor': actor, 'note': note}),
    );
    await _decode(r);
  }

  static Future<void> suspendDriver(int id, {String actor = 'admin', String? reason}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/driver-applications/$id/suspend'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{
        'actor': actor, if (reason != null && reason.isNotEmpty) 'reason': reason,
      }),
    );
    await _decode(r);
  }

  static Future<void> unsuspendDriver(int id, {String actor = 'admin'}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/driver-applications/$id/unsuspend'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{'actor': actor}),
    );
    await _decode(r);
  }

  static Future<void> approveDriverDoc(int docId, {String actor = 'admin'}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/driver-documents/$docId/approve'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{'actor': actor}),
    );
    await _decode(r);
  }

  static Future<void> rejectDriverDoc(int docId, {required String reason, String actor = 'admin'}) async {
    final r = await http.post(
      Uri.parse('$_base/admin/driver-documents/$docId/reject'),
      headers: _headers(),
      body: jsonEncode(<String, dynamic>{'actor': actor, 'reason': reason}),
    );
    await _decode(r);
  }

  /// Build a signed URL that a browser can open for a stored Drive file.
  /// Backend accepts ?token= on GET /api/admin/drive/:id/stream
  static String driveStreamUrl(String fileId) =>
      '$_base/admin/drive/$fileId/stream?token=$devAdminToken';
}

class AdminApiException implements Exception {
  final int statusCode;
  final String message;
  AdminApiException(this.statusCode, this.message);
  @override
  String toString() => 'AdminApiException($statusCode): $message';
}
