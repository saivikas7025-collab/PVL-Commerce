import 'api_client.dart';
import 'auth_service.dart';

/// Client-side helper for talking to /api/payment (Razorpay + COD conversion).
class PaymentService {
  /// Ask the backend to create (or reuse) a Razorpay order for [orderId].
  /// Returns `{key_id, order_id, amount, currency}`.
  static Future<Map<String, dynamic>> createRazorpayOrder(int orderId) async {
    final token = await AuthService.getToken();
    final data = await ApiClient.post(
      '/payment/razorpay/order',
      {'orderId': orderId},
      token: token,
    );
    return Map<String, dynamic>.from(data as Map);
  }

  /// Verify a successful Razorpay checkout with the backend.
  /// Returns `true` when the signature is valid.
  static Future<bool> verifyRazorpayPayment({
    required int orderId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final token = await AuthService.getToken();
    try {
      final data = await ApiClient.post(
        '/payment/razorpay/verify',
        {
          'orderId': orderId,
          'razorpay_order_id': razorpayOrderId,
          'razorpay_payment_id': razorpayPaymentId,
          'razorpay_signature': razorpaySignature,
        },
        token: token,
      );
      return data is Map && data['verified'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Switch a pending order over to Cash on Delivery (used when the user
  /// cancels or fails a Razorpay checkout).
  static Future<void> convertToCod(int orderId) async {
    final token = await AuthService.getToken();
    await ApiClient.put(
      '/payment/order/$orderId/method',
      {'paymentMethod': 'COD'},
      token: token,
    );
  }

  /// Feature flags returned by the server.
  static Future<Map<String, bool>> publicConfig() async {
    try {
      final data = await ApiClient.get('/config/public');
      return {
        'cod_enabled': data['cod_enabled'] == true,
        'razorpay_enabled': data['razorpay_enabled'] == true,
      };
    } catch (_) {
      return const {'cod_enabled': true, 'razorpay_enabled': false};
    }
  }
}
