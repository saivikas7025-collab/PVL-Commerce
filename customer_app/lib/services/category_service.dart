import 'package:flutter/material.dart';
import 'api_client.dart';
import '../models/category.dart';
import '../models/product.dart';
import '../models/section.dart';

class CategoryService {
  // -------------------------------------------------------------
  // Legacy endpoints (kept — other screens may still use them)
  // -------------------------------------------------------------
  static Future<List<Category>> getCategories() async {
    final data = await ApiClient.get('/products/categories');
    final list = (data is Map ? data['categories'] : data) as List? ?? [];
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
      final list = (data is Map ? data['sections'] : data) as List? ?? [];
      return list
          .map((e) => HomeSection.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  // -------------------------------------------------------------
  // NEW: /api/sections endpoints (Blinkit-style browsing)
  // -------------------------------------------------------------

  /// GET /api/sections?store_id=1
  /// Returns the 20 top-level sections only — no subcategories.
  static Future<List<Section>> getSections() async {
    final data = await ApiClient.get('/sections?store_id=1');
    final list = (data is Map ? data['sections'] : data) as List? ?? [];
    return list
        .map((e) => Section.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /api/sections/{name}/categories
  static Future<List<HomeCategory>> getSectionCategories(String section) async {
    final encoded = Uri.encodeComponent(section);
    final data = await ApiClient.get('/sections/$encoded/categories');
    final list = (data is Map ? data['categories'] : data) as List? ?? [];
    return list
        .map((e) => HomeCategory.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /api/sections/{name}/products?category_id=X
  static Future<List<Product>> getSectionProducts(
    String section, {
    int? categoryId,
  }) async {
    final encoded = Uri.encodeComponent(section);
    final qs = categoryId != null ? '?category_id=$categoryId' : '';
    final data = await ApiClient.get('/sections/$encoded/products$qs');
    final list = (data is Map ? data['products'] : data) as List? ?? [];
    return list
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
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
        icon: (j['icon'] ?? '\u{1F4E6}') as String,
        bgColor: _hexToColor(j['bg_color'] as String?),
        productCount: (j['product_count'] ?? 0) as int,
      );

  static Color _hexToColor(String? hex) {
    if (hex == null || hex.isEmpty) return const Color(0xFFF0F0F0);
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }
}
