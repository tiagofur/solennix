class EventExtraEntity {
  final String id;
  final String eventId;
  final String description;
  final double cost;
  final double price;
  final bool excludeUtility;

  EventExtraEntity({
    required this.id,
    required this.eventId,
    required this.description,
    required this.cost,
    required this.price,
    required this.excludeUtility,
  });
}
