/// A single line in the server-side cart.
///
/// [fromJson] accepts numeric fields as either JSON numbers or strings
/// because some PostgreSQL drivers stringify NUMERIC columns.
class CartItem {
  final int productId;
  final String name;
  final String? imageUrl;
  final double price;
  final int quantity;
  final String unit;

  CartItem({
    required this.productId,
    required this.name,
    this.imageUrl,
    required this.price,
    required this.quantity,
    required this.unit,
  });

  factory CartItem.fromJson(Map<String, dynamic> json) {
    double d(dynamic v) => double.tryParse('${v ?? 0}') ?? 0;
    int i(dynamic v) => int.tryParse('${v ?? 0}') ?? 0;
    return CartItem(
      productId: i(json['product_id']),
      name: '${json['name'] ?? ''}',
      imageUrl: json['image_url']?.toString(),
      price: d(json['price']),
      quantity: i(json['quantity']),
      unit: '${json['unit'] ?? ''}',
    );
  }

  double get total => price * quantity;
}
