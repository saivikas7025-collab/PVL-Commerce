class Product {
  final int id;
  final String name, description, unit, categoryName, mainCategory, subcategory;
  final double price;
  final double? originalPrice;
  final String? imageUrl;
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
      categoryId: i(j['category_id']),
      categoryName: '${j['category_name'] ?? ''}',
      mainCategory: '${j['main_category'] ?? ''}',
      subcategory: '${j['subcategory'] ?? ''}',
      isActive: j['is_active'] == true || '${j['is_active']}' == 'true',
    );
  }
}
