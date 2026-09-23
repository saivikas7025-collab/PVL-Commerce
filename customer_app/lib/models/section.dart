import 'package:flutter/material.dart';

class Section {
  final String name;
  final String icon;
  final Color bgColor;
  final int subcategoryCount;
  final int productCount;

  Section({
    required this.name,
    required this.icon,
    required this.bgColor,
    required this.subcategoryCount,
    required this.productCount,
  });

  factory Section.fromJson(Map<String, dynamic> j) => Section(
        name: (j['name'] ?? '') as String,
        icon: (j['icon'] ?? '\u{1F4E6}') as String,
        bgColor: _hexToColor(j['bg_color'] as String?),
        subcategoryCount: (j['subcategory_count'] ?? 0) as int,
        productCount: (j['product_count'] ?? 0) as int,
      );

  static Color _hexToColor(String? hex) {
    if (hex == null || hex.isEmpty) return const Color(0xFFF0F0F0);
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }
}
