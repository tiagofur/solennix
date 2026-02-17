class EventExtraModel {
  final String id;
  final String eventId;
  final String description;
  final double cost;
  final double price;
  final bool excludeUtility;

  EventExtraModel({
    required this.id,
    required this.eventId,
    required this.description,
    required this.cost,
    required this.price,
    required this.excludeUtility,
  });

  factory EventExtraModel.fromJson(Map<String, dynamic> json) {
    return EventExtraModel(
      id: json['id']?.toString() ?? '',
      eventId: json['event_id']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      cost: (json['cost'] as num?)?.toDouble() ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      excludeUtility: json['exclude_utility'] as bool? ?? false,
    );
  }
}
