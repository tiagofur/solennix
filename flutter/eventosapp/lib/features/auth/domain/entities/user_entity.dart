/// Entidad de usuario del dominio
class UserEntity {
  final String id;
  final String email;
  final String name;
  final String? businessName;
  final double? defaultDepositPercent;
  final double? defaultCancellationDays;
  final double? defaultRefundPercent;
  final String plan;
  final String? stripeCustomerId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserEntity({
    required this.id,
    required this.email,
    required this.name,
    this.businessName,
    this.defaultDepositPercent,
    this.defaultCancellationDays,
    this.defaultRefundPercent,
    required this.plan,
    this.stripeCustomerId,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isPremium => plan == 'premium';

  String get displayName => businessName ?? name;
}
