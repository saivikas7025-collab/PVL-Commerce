import '../models/product.dart';
import 'api_client.dart';

class ProductService {
  static Future<List<Product>> getProducts() async {
    final d = await ApiClient.get('/products');
    if (d is! Map || d['products'] is! List)
      throw const ApiException(
        'Products list is missing from server response.',
      );
    return (d['products'] as List)
        .whereType<Map>()
        .map((x) => Product.fromJson(Map<String, dynamic>.from(x)))
        .where((p) => p.id > 0 && p.name.isNotEmpty)
        .toList();
  }
}
