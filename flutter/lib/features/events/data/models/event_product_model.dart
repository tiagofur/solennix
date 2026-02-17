class EventProductModel {
  final String id;
  final String eventId;
  final String productId;
  final String productName;
  final String? productCategory;
  final double quantity;
  final double unitPrice;
  final double discount;
  final double? totalPrice;

  EventProductModel({
    required this.id,
    required this.eventId,
    required this.productId,
    required this.productName,
    this.productCategory,
    required this.quantity,
    required this.unitPrice,
    required this.discount,
    this.totalPrice,
  });

  factory EventProductModel.fromJson(Map<String, dynamic> json) {
    final productJson = json['products'] as Map<String, dynamic>?;
    return EventProductModel(
      id: json['id']?.toString() ?? '',
      eventId: json['event_id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? '',
      productName: productJson?['name']?.toString() ?? 'Producto',
      productCategory: productJson?['category']?.toString(),
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      totalPrice: (json['total_price'] as num?)?.toDouble(),
    );
  }
}
