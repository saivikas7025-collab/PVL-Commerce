import 'api_client.dart';
import '../models/cart.dart';
import 'auth_service.dart';

class CartService {
  static Future<List<CartItem>> getCart() async {
    if (!await AuthService.validateSession()) return [];
    final token = await AuthService.getToken();
    final data = await ApiClient.get('/cart', token: token);
    final items = data['cart'] as List? ?? [];
    return items.map((e) => CartItem.fromJson(e)).toList();
  }

  static Future<void> addToCart(int productId, {int quantity = 1}) async {
    if (!await AuthService.validateSession()) throw Exception('Please login');
    final token = await AuthService.getToken();
    await ApiClient.post(
        '/cart', {'productId': productId, 'quantity': quantity}, token: token);
  }

  static Future<void> updateQuantity(int productId, int quantity) async {
    if (!await AuthService.validateSession()) throw Exception('Please login');
    final token = await AuthService.getToken();
    await ApiClient.put('/cart/$productId', {'quantity': quantity}, token: token);
  }

  static Future<void> removeFromCart(int productId) async {
    if (!await AuthService.validateSession()) throw Exception('Please login');
    final token = await AuthService.getToken();
    await ApiClient.delete('/cart/$productId', token: token);
  }

  static Future<void> clearCart() async {
    if (!await AuthService.validateSession()) return;
    final token = await AuthService.getToken();
    await ApiClient.delete('/cart', token: token);
  }
}
