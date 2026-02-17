class UserProfileModel {
  final String id;
  final String email;
  final String name;
  final String? businessName;
  final double? defaultDepositPercent;
  final double? defaultCancellationDays;
  final double? defaultRefundPercent;

  UserProfileModel({
    required this.id,
    required this.email,
    required this.name,
    this.businessName,
    this.defaultDepositPercent,
    this.defaultCancellationDays,
    this.defaultRefundPercent,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      businessName: json['business_name']?.toString(),
      defaultDepositPercent: (json['default_deposit_percent'] as num?)?.toDouble(),
      defaultCancellationDays: (json['default_cancellation_days'] as num?)?.toDouble(),
      defaultRefundPercent: (json['default_refund_percent'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toUpdateJson() {
    return {
      'name': name,
      'business_name': businessName,
      'default_deposit_percent': defaultDepositPercent,
      'default_cancellation_days': defaultCancellationDays,
      'default_refund_percent': defaultRefundPercent,
    };
  }

  UserProfileModel copyWith({
    String? id,
    String? email,
    String? name,
    String? businessName,
    double? defaultDepositPercent,
    double? defaultCancellationDays,
    double? defaultRefundPercent,
  }) {
    return UserProfileModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      businessName: businessName ?? this.businessName,
      defaultDepositPercent: defaultDepositPercent ?? this.defaultDepositPercent,
      defaultCancellationDays: defaultCancellationDays ?? this.defaultCancellationDays,
      defaultRefundPercent: defaultRefundPercent ?? this.defaultRefundPercent,
    );
  }
}
