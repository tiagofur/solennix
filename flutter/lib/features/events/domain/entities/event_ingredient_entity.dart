class EventIngredientEntity {
  final String inventoryId;
  final String name;
  final String unit;
  final double quantity;
  final double cost;

  EventIngredientEntity({
    required this.inventoryId,
    required this.name,
    required this.unit,
    required this.quantity,
    required this.cost,
  });
}
