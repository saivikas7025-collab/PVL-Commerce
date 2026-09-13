import 'package:flutter/material.dart';

class Product {
  final int id;
  final String name, description, unit, categoryName, mainCategory, subcategory;
  final double price;
  final double? originalPrice;
  final String? imageUrl;
  final String? icon;
  final String? bgColor;
  final int? categoryId;
  final bool isActive;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.unit,
    required this.price,
    required this.originalPrice,
    required this.imageUrl,
    this.icon,
    this.bgColor,
    required this.categoryId,
    required this.categoryName,
    required this.mainCategory,
    required this.subcategory,
    required this.isActive,
  });

  factory Product.fromJson(Map<String, dynamic> j) {
    double d(dynamic v) => double.tryParse('${v ?? 0}') ?? 0;
    int? i(dynamic v) => int.tryParse('${v ?? ''}');
    return Product(
      id: i(j['id']) ?? 0,
      name: '${j['name'] ?? ''}',
      description: '${j['description'] ?? ''}',
      unit: '${j['unit'] ?? ''}',
      price: d(j['price']),
      originalPrice:
          j['original_price'] == null ? null : d(j['original_price']),
      imageUrl: j['image_url']?.toString(),
      icon: j['icon']?.toString(),
      bgColor: j['bg_color']?.toString(),
      categoryId: i(j['category_id']),
      categoryName: '${j['category_name'] ?? ''}',
      mainCategory: '${j['main_category'] ?? ''}',
      subcategory: '${j['subcategory'] ?? ''}',
      isActive: j['is_active'] == true || '${j['is_active']}' == 'true',
    );
  }

  /// Emoji to show for this product. Uses DB value if present,
  /// otherwise falls back to a keyword lookup so it never renders blank.
  String get resolvedIcon {
    if (icon != null && icon!.isNotEmpty) return icon!;
    final n = name.toLowerCase();
    if (n.contains('apple')) return '🍎';
    if (n.contains('banana')) return '🍌';
    if (n.contains('orange')) return '🍊';
    if (n.contains('tomato')) return '🍅';
    if (n.contains('onion')) return '🧅';
    if (n.contains('potato')) return '🥔';
    if (n.contains('milk') || n.contains('buttermilk')) return '🥛';
    if (n.contains('egg')) return '🥚';
    if (n.contains('paneer')) return '🧈';
    if (n.contains('parle') || n.contains('biscuit') || n.contains('marie')) return '🍪';
    if (n.contains('chips')) return '🥔';
    if (n.contains('coca') || n.contains('cola')) return '🥤';
    if (n.contains('tea')) return '☕';
    if (n.contains('surf')) return '🧺';
    if (n.contains('vim')) return '🧽';
    if (n.contains('colgate')) return '🪥';
    return '📦';
  }

  /// Pastel background color. Uses DB value if present, otherwise a soft gray.
  Color get resolvedBgColor {
    final raw = bgColor;
    if (raw == null || raw.isEmpty) return const Color(0xFFF0F0F0);
    try {
      final h = raw.replaceAll('#', '');
      return Color(int.parse('FF$h', radix: 16));
    } catch (_) {
      return const Color(0xFFF0F0F0);
    }
  }
}
