/// Entidad de cliente del dominio
class ClientEntity {
  final String id;
  final String userId;
  final String name;
  final String phone;
  final String? email;
  final String? address;
  final String? city;
  final String? notes;
  final int totalEvents;
  final double totalSpent;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ClientEntity({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.email,
    this.address,
    this.city,
    this.notes,
    required this.totalEvents,
    required this.totalSpent,
    required this.createdAt,
    required this.updatedAt,
  });

  String get initials {
    return name
        .split(' ')
        .map((word) => word.isNotEmpty ? word[0].toUpperCase() : '')
        .take(2)
        .join('');
  }
}
