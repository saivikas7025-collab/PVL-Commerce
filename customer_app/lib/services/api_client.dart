import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiClient {
  static Map<String, String> _headers(String? token) {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static dynamic _decode(http.Response response) {
    final body = response.body.trim();
    final contentType = (response.headers['content-type'] ?? '').toLowerCase();

    if (body.isEmpty) {
      return <String, dynamic>{};
    }

    if (!contentType.contains('application/json')) {
      throw ApiException(
        'Server returned non-JSON data. Check ${ApiConfig.baseUrl}.',
        statusCode: response.statusCode,
      );
    }

    try {
      return jsonDecode(body);
    } catch (_) {
      throw ApiException(
        'Server returned invalid JSON.',
        statusCode: response.statusCode,
      );
    }
  }

  static void _check(http.Response response, dynamic data) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }

    final message = data is Map && data['message'] != null
        ? data['message'].toString()
        : 'Request failed (HTTP ${response.statusCode}).';

    throw ApiException(
      message,
      statusCode: response.statusCode,
    );
  }

  static Future<dynamic> get(
    String path, {
    String? token,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(token),
      );

      final data = _decode(response);
      _check(response, data);

      return data;
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException('Unable to connect to backend. $e');
    }
  }

  static Future<dynamic> post(
    String path,
    Map<String, dynamic> body, {
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(token),
        body: jsonEncode(body),
      );

      final data = _decode(response);
      _check(response, data);

      return data;
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException('Unable to connect to backend. $e');
    }
  }

  static Future<dynamic> put(
    String path,
    Map<String, dynamic> body, {
    String? token,
  }) async {
    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(token),
        body: jsonEncode(body),
      );

      final data = _decode(response);
      _check(response, data);

      return data;
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException('Unable to connect to backend. $e');
    }
  }

  static Future<dynamic> delete(
    String path, {
    String? token,
  }) async {
    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(token),
      );

      final data = _decode(response);
      _check(response, data);

      return data;
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException('Unable to connect to backend. $e');
    }
  }
}
