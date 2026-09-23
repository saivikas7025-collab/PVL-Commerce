import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' show MediaType;
import '../config/api_config.dart';
import '../config/dev_driver_token.dart';

class DriverKycApi {
  static String devToken = kDevDriverToken;
  static String get _base => ApiConfig.baseUrl;
  static Map<String, String> _auth() =>
      {'Authorization': 'Bearer $devToken'};

  static Future<Map<String, dynamic>> _decode(http.Response r) async {
    Map<String, dynamic> body;
    try { body = jsonDecode(r.body) as Map<String, dynamic>; }
    catch (_) { body = {'success': false, 'message': 'Bad JSON (HTTP ${r.statusCode})'}; }
    if (r.statusCode >= 200 && r.statusCode < 300) return body;
    throw Exception(body['message'] ?? body['error'] ?? 'HTTP ${r.statusCode}');
  }

  static Future<Map<String, dynamic>> status(int driverId) async {
    final r = await http.get(Uri.parse('$_base/driver-kyc/$driverId/status'), headers: _auth());
    return _decode(r);
  }

  static Future<Map<String, dynamic>> uploadFile({
    required int driverId,
    required String docType,
    required String filename,
    required List<int> bytes,
    required String mimeType,
  }) async {
    final uri = Uri.parse('$_base/uploads');
    final req = http.MultipartRequest('POST', uri);
    req.headers.addAll(_auth());
    req.fields['driver_id'] = driverId.toString();
    req.fields['doc_type'] = docType.toUpperCase();
    req.files.add(http.MultipartFile.fromBytes(
      'file', bytes,
      filename: filename,
      contentType: _parseMediaType(mimeType),
    ));
    final streamed = await req.send();
    final r = await http.Response.fromStream(streamed);
    return _decode(r);
  }

  static Future<Map<String, dynamic>> registerDocument({
    required int driverId,
    required String docType,
    required String docNumber,
    required String frontUrl,
    String? backUrl,
    String? expiryDate,
  }) async {
    final r = await http.post(
      Uri.parse('$_base/driver-kyc/$driverId/document'),
      headers: {'Content-Type': 'application/json', ..._auth()},
      body: jsonEncode({
        'doc_type': docType.toUpperCase(),
        'doc_number': docNumber,
        'front_url': frontUrl,
        if (backUrl != null) 'back_url': backUrl,
        if (expiryDate != null) 'expiry_date': expiryDate,
      }),
    );
    return _decode(r);
  }

  static Future<Map<String, dynamic>> submit(int driverId) async {
    final r = await http.post(Uri.parse('$_base/driver-kyc/$driverId/submit'), headers: _auth());
    return _decode(r);
  }

  static Future<Map<String, dynamic>> canGoOnline(int driverId) async {
    final r = await http.get(Uri.parse('$_base/driver-kyc/$driverId/can-go-online'), headers: _auth());
    return _decode(r);
  }

  static MediaType _parseMediaType(String s) {
    final parts = s.split('/');
    if (parts.length == 2) return MediaType(parts[0], parts[1]);
    return MediaType('application', 'octet-stream');
  }
}
