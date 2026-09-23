import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Backend-driven pricing. The client NEVER calculates totals.
/// All math happens in POST /api/checkout/calculate.
class PricingService {
  /// Calculate checkout pricing.
  /// [items] must be a list of `{product_id, store_id, quantity}`.
  static Future<Map<String, dynamic>> calculate({
    required int addressId,
    required List<Map<String, dynamic>> items,
    String? couponCode,
    int? customerId,
  }) async {
    final body = <String, dynamic>{
      'address_id': addressId,
      'items': items,
      if (couponCode != null && couponCode.isNotEmpty) 'coupon_code': couponCode,
      if (customerId != null) 'customer_id': customerId,
    };

    final r = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/checkout/calculate'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));

    Map<String, dynamic> data;
    try {
      data = jsonDecode(r.body) as Map<String, dynamic>;
    } catch (_) {
      throw Exception('Invalid pricing response (HTTP ${r.statusCode})');
    }

    if (r.statusCode >= 200 && r.statusCode < 300 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? 'Pricing failed (HTTP ${r.statusCode})');
  }

  /// Simple safe parsing helpers
  static double toDouble(dynamic v) {
    if (v == null) return 0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }

  static int toInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString()) ?? 0;
  }
}
