import 'api_client.dart';
import '../models/category.dart';

class CategoryService {
  static Future<List<Category>> getCategories() async {
    final data = await ApiClient.get('/products/categories');
    final list = data['categories'] as List? ?? [];
    return list.map((e) => Category.fromJson(e)).toList();
  }

  static Future<List<Subcategory>> getSubcategories(int categoryId) async {
    final data = await ApiClient.get('/subcategories/$categoryId');
    final list = data as List? ?? [];
    return list.map((e) => Subcategory.fromJson(e)).toList();
  }
}
