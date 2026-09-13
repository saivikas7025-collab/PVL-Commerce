import '../models/order.dart';
import 'api_client.dart';
import 'auth_service.dart';

class OrderService {
  /// List the signed-in customer's orders.
  static Future<List<Order>> getOrders() async {
    if (!await AuthService.validateSession()) return [];
    final token = await AuthService.getToken();
    final data = await ApiClient.get('/orders', token: token);
    final orders = (data is Map ? (data['orders'] as List? ?? []) : []);
    return orders.map((e) => Order.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  /// Load one order with items + status history.
  static Future<Map<String, dynamic>> getOrder(int id) async {
    final token = await AuthService.getToken();
    final data = await ApiClient.get('/orders/$id', token: token);
    return Map<String, dynamic>.from(data['order'] as Map);
  }

  /// Create a real order from the current server-side cart.
  static Future<Map<String, dynamic>> createOrder({
    required int addressId,
    required String paymentMethod, // 'COD' | 'RAZORPAY' | 'UPI'
    String? notes,
  }) async {
    final token = await AuthService.getToken();
    final data = await ApiClient.post(
      '/orders',
      {
        'addressId': addressId,
        'paymentMethod': paymentMethod,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
      token: token,
    );
    return Map<String, dynamic>.from(data as Map);
  }

  /// Customer claims they have paid via UPI to 9063257025@ybl.
  /// Backend records this and marks the order payment as
  /// "awaiting_verification" so the store/admin can confirm.
  static Future<void> confirmUpiPayment({
    required int orderId,
    required String upiReference,
  }) async {
    final token = await AuthService.getToken();
    await ApiClient.post(
      '/payment/upi/confirm',
      {'orderId': orderId, 'upiReference': upiReference},
      token: token,
    );
  }
}
