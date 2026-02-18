import 'package:eventosapp/features/clients/domain/entities/client_entity.dart';

class ClientModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? address;
  final String? city;
  final String? notes;
  final List<ClientEvent> events;
  final double totalSpent;
  final int eventsCount;
  final String createdAt;
  final String updatedAt;

  ClientModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.address,
    this.city,
    this.notes,
    this.events = const [],
    this.totalSpent = 0,
    this.eventsCount = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ClientModel.fromJson(Map<String, dynamic> json) {
    List<ClientEvent> parsedEvents = [];
    if (json['events'] != null) {
      parsedEvents = (json['events'] as List<dynamic>).map((e) {
        final map = e as Map<String, dynamic>;
        return ClientEvent(
          id: map['id'] as String,
          eventName: map['event_name'] as String? ??
              map['eventName'] as String? ??
              'Evento',
          status: map['status'] as String? ?? 'pending',
          eventDate: DateTime.tryParse(map['event_date'] as String? ?? '') ??
              DateTime.now(),
          totalAmount: (map['total_amount'] as num?)?.toDouble() ?? 0,
          collectedAmount: (map['collected_amount'] as num?)?.toDouble() ?? 0,
          serviceType: map['service_type'] as String?,
          numPeople: map['num_people'] as int?,
        );
      }).toList();
    }

    return ClientModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      notes: json['notes'] as String?,
      events: parsedEvents,
      totalSpent: (json['total_spent'] as num?)?.toDouble() ?? 0,
      eventsCount: json['total_events'] as int? ?? parsedEvents.length,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'address': address,
      'city': city,
      'notes': notes,
      'events': events.map((e) => e.toJson()).toList(),
      'total_spent': totalSpent,
      'total_events': eventsCount,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  ClientEntity toEntity() {
    return ClientEntity(
      id: id,
      name: name,
      email: email,
      phone: phone,
      address: address,
      city: city,
      notes: notes,
      events: events,
      totalSpent: totalSpent,
      eventsCount: eventsCount,
      createdAt: DateTime.parse(createdAt),
      updatedAt: DateTime.parse(updatedAt),
    );
  }

  static ClientModel fromEntity(ClientEntity entity) {
    return ClientModel(
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      address: entity.address,
      city: entity.city,
      notes: entity.notes,
      events: entity.events,
      totalSpent: entity.totalSpent,
      eventsCount: entity.eventsCount,
      createdAt: entity.createdAt.toIso8601String(),
      updatedAt: entity.updatedAt.toIso8601String(),
    );
  }
}
