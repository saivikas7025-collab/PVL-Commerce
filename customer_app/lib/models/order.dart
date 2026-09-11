/// JSON number/string coercers used across model factories.
///
/// The backend sometimes returns numeric columns as JSON strings (a common
/// quirk of some PostgreSQL drivers). These helpers accept either shape.
double _d(dynamic v) => double.tryParse('${v ?? 0}') ?? 0;
int _i(dynamic v) => int.tryParse('${v ?? 0}') ?? 0;

class Order {
  final int id;
  final String status;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String createdAt;
  final List<OrderItem> items;

  Order({
    required this.id,
    required this.status,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.createdAt,
    required this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final itemsList = json['items'] as List? ?? [];
    return Order(
      id: _i(json['id']),
      status: '${json['status'] ?? 'pending'}',
      totalAmount: _d(json['total_amount']),
      paymentMethod: '${json['payment_method'] ?? ''}',
      paymentStatus: '${json['payment_status'] ?? ''}',
      createdAt: '${json['created_at'] ?? ''}',
      items: itemsList
          .map((e) => OrderItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }
}

class OrderItem {
  final int id;
  final int productId;
  final String productName;
  final int quantity;
  final double price;
  final double totalPrice;

  OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.totalPrice,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: _i(json['id']),
      productId: _i(json['product_id']),
      productName: '${json['product_name'] ?? ''}',
      quantity: _i(json['quantity']),
      price: _d(json['price']),
      totalPrice: _d(json['total_price']),
    );
  }
}
