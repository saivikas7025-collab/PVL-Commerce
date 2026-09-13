import 'package:flutter/material.dart';
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

  /// GET /api/home — returns sectioned categories for home screen.
  static Future<List<HomeSection>> getHomeSections() async {
    try {
      final data = await ApiClient.get('/home');
      final list = data['sections'] as List? ?? [];
      return list
          .map((e) => HomeSection.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }
}

class HomeSection {
  final String name;
  final List<HomeCategory> categories;
  HomeSection({required this.name, required this.categories});

  factory HomeSection.fromJson(Map<String, dynamic> j) => HomeSection(
        name: (j['name'] ?? '') as String,
        categories: ((j['categories'] as List?) ?? [])
            .map((e) => HomeCategory.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class HomeCategory {
  final int id;
  final String name;
  final String icon;
  final Color bgColor;
  final int productCount;
  HomeCategory({
    required this.id,
    required this.name,
    required this.icon,
    required this.bgColor,
    required this.productCount,
  });

  factory HomeCategory.fromJson(Map<String, dynamic> j) => HomeCategory(
        id: (j['id'] ?? 0) as int,
        name: (j['name'] ?? '') as String,
        icon: (j['icon'] ?? '📦') as String,
        bgColor: _hexToColor(j['bg_color'] as String?),
        productCount: (j['product_count'] ?? 0) as int,
      );

  static Color _hexToColor(String? hex) {
    if (hex == null || hex.isEmpty) return const Color(0xFFF0F0F0);
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }
}
