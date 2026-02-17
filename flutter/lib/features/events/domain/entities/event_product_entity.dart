class EventProductEntity {
  final String id;
  final String eventId;
  final String productId;
  final String productName;
  final String? productCategory;
  final double quantity;
  final double unitPrice;
  final double discount;
  final double? totalPrice;

  EventProductEntity({
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

  double get lineTotal => (unitPrice - discount) * quantity;
}
