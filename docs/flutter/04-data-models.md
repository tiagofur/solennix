# Modelos de Datos

Definición completa de los modelos Dart para la app Flutter.

## Estado Real de los Modelos

Los modelos documentados aqui son los que **realmente existen** en el codigo. Algunos difieren del plan original:

| Modelo | Archivo Real | Notas |
|---|---|---|
| `ClientEntity` | `features/clients/domain/entities/client_entity.dart` | Incluye `ClientEvent` y `ClientPayment` en el mismo archivo |
| `ClientEvent` | `features/clients/domain/entities/client_entity.dart` | Clase separada para eventos del cliente |
| `ClientPayment` | `features/clients/domain/entities/client_entity.dart` | Incluye campo `eventName` (String?) |
| `EventEntity` | `features/events/domain/entities/event_entity.dart` | OK |
| `ProductEntity` | `features/products/domain/entities/product_entity.dart` | OK |
| `RecipeIngredientModel` | `features/products/data/models/product_model.dart` | Clase dentro del mismo archivo que ProductModel |
| `InventoryEntity` | `features/inventory/domain/entities/inventory_entity.dart` | OK |
| `TokensModel` | No existe como archivo separado | Los tokens se guardan directamente en SecureStorage |
| `DashboardStatsEntity` | Puede tener datos mock | Ver Gap 3 en 06-implementation-plan.md |
| `EventProductEntity` | Puede estar inline en events_page.dart | Verificar si existe como archivo separado |
| `EventExtraEntity` | Puede estar inline en events_page.dart | Verificar si existe como archivo separado |
| `PaymentEntity` | Puede estar inline en events_page.dart | Verificar si existe como archivo separado |

## 📦 Convenciones

- **Entities**: Entidades del dominio (puro Dart, sin dependencias externas)
- **Models**: DTOs para API/Storage (con fromJson/toJson)
- **Converters**: Métodos para convertir entre Entity y Model

---

## Modelos Adicionales (Reales, no en el plan original)

### ClientEvent

```dart
/// Evento asociado a un cliente (para ClientDetailPage tab Eventos)
class ClientEvent {
  final String id;
  final String serviceType;
  final DateTime eventDate;
  final String status;
  final double totalAmount;
  final double paidAmount;

  const ClientEvent({
    required this.id,
    required this.serviceType,
    required this.eventDate,
    required this.status,
    required this.totalAmount,
    required this.paidAmount,
  });

  double get pendingAmount => totalAmount - paidAmount;
}
```

### ClientPayment (con eventName)

```dart
/// Pago asociado a un cliente (para ClientDetailPage tab Pagos)
class ClientPayment {
  final String id;
  final String eventId;
  final String? eventName;   // <-- campo clave: nombre del evento para mostrar en lugar del UUID
  final double amount;
  final DateTime paymentDate;
  final String paymentMethod;
  final String? notes;

  const ClientPayment({
    required this.id,
    required this.eventId,
    this.eventName,
    required this.amount,
    required this.paymentDate,
    required this.paymentMethod,
    this.notes,
  });
}
```

### RecipeIngredientModel

```dart
/// Ingrediente de receta (dentro de product_model.dart)
class RecipeIngredientModel {
  final String inventoryId;
  final String? ingredientName;
  final double quantityRequired;
  final String? unit;
  final double? unitCost;

  RecipeIngredientModel({
    required this.inventoryId,
    this.ingredientName,
    required this.quantityRequired,
    this.unit,
    this.unitCost,
  });

  factory RecipeIngredientModel.fromJson(Map<String, dynamic> json) {
    return RecipeIngredientModel(
      inventoryId: json['inventory_id'] as String,
      ingredientName: json['ingredient_name'] as String?,
      quantityRequired: (json['quantity_required'] as num).toDouble(),
      unit: json['unit'] as String?,
      unitCost: (json['unit_cost'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'inventory_id': inventoryId,
      'quantity_required': quantityRequired,
    };
  }

  double? get estimatedCost {
    if (unitCost == null) return null;
    return quantityRequired * unitCost!;
  }
}
```

---



## 🔐 Auth Models

### UserEntity

```dart
/// Entidad de usuario del dominio
class UserEntity {
  final String id;
  final String email;
  final String name;
  final String? businessName;
  final double? defaultDepositPercent;
  final double? defaultCancellationDays;
  final double? defaultRefundPercent;
  final String plan; // 'basic' | 'premium'
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

  /// Verifica si el usuario tiene plan premium
  bool get isPremium => plan == 'premium';

  /// Obtiene el nombre para mostrar
  String get displayName => businessName ?? name;
}
```

### UserModel

```dart
/// Modelo de usuario para API/Storage
class UserModel {
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

  UserModel({
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

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      businessName: json['business_name'] as String?,
      defaultDepositPercent: (json['default_deposit_percent'] as num?)?.toDouble(),
      defaultCancellationDays: (json['default_cancellation_days'] as num?)?.toDouble(),
      defaultRefundPercent: (json['default_refund_percent'] as num?)?.toDouble(),
      plan: json['plan'] as String,
      stripeCustomerId: json['stripe_customer_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'business_name': businessName,
      'default_deposit_percent': defaultDepositPercent,
      'default_cancellation_days': defaultCancellationDays,
      'default_refund_percent': defaultRefundPercent,
      'plan': plan,
      'stripe_customer_id': stripeCustomerId,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  UserEntity toEntity() {
    return UserEntity(
      id: id,
      email: email,
      name: name,
      businessName: businessName,
      defaultDepositPercent: defaultDepositPercent,
      defaultCancellationDays: defaultCancellationDays,
      defaultRefundPercent: defaultRefundPercent,
      plan: plan,
      stripeCustomerId: stripeCustomerId,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  static UserModel fromEntity(UserEntity entity) {
    return UserModel(
      id: entity.id,
      email: entity.email,
      name: entity.name,
      businessName: entity.businessName,
      defaultDepositPercent: entity.defaultDepositPercent,
      defaultCancellationDays: entity.defaultCancellationDays,
      defaultRefundPercent: entity.defaultRefundPercent,
      plan: entity.plan,
      stripeCustomerId: entity.stripeCustomerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }
}
```

### TokensModel

```dart
/// Modelo de tokens de autenticación
class TokensModel {
  final String accessToken;
  final String refreshToken;
  final int expiresIn; // en segundos

  TokensModel({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory TokensModel.fromJson(Map<String, dynamic> json) {
    return TokensModel(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      expiresIn: json['expires_in'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'access_token': accessToken,
      'refresh_token': refreshToken,
      'expires_in': expiresIn,
    };
  }

  /// Calcula la fecha de expiración del access token
  DateTime get expirationDate {
    return DateTime.now().add(Duration(seconds: expiresIn));
  }

  /// Verifica si el token está expirado
  bool get isExpired {
    return DateTime.now().isAfter(expirationDate);
  }

  /// Verifica si el token está por expirar (menos de 5 minutos)
  bool get isExpiringSoon {
    return DateTime.now().add(Duration(minutes: 5)).isAfter(expirationDate);
  }
}
```

---

## 👥 Client Models

### ClientEntity

```dart
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

  /// Obtiene las iniciales para el avatar
  String get initials {
    return name.split(' ')
        .map((word) => word.isNotEmpty ? word[0].toUpperCase() : '')
        .take(2)
        .join();
  }

  /// Formatea el monto gastado como moneda
  String get totalSpentFormatted {
    return NumberFormat.currency(
      locale: 'es_MX',
      symbol: '\$',
      decimalDigits: 2,
    ).format(totalSpent);
  }
}
```

### ClientModel

```dart
/// Modelo de cliente para API/Storage
@JsonSerializable()
class ClientModel {
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

  ClientModel({
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

  factory ClientModel.fromJson(Map<String, dynamic> json) {
    return ClientModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      notes: json['notes'] as String?,
      totalEvents: json['total_events'] as int? ?? 0,
      totalSpent: (json['total_spent'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'phone': phone,
      'email': email,
      'address': address,
      'city': city,
      'notes': notes,
      'total_events': totalEvents,
      'total_spent': totalSpent,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  ClientEntity toEntity() {
    return ClientEntity(
      id: id,
      userId: userId,
      name: name,
      phone: phone,
      email: email,
      address: address,
      city: city,
      notes: notes,
      totalEvents: totalEvents,
      totalSpent: totalSpent,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  static ClientModel fromEntity(ClientEntity entity) {
    return ClientModel(
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      phone: entity.phone,
      email: entity.email,
      address: entity.address,
      city: entity.city,
      notes: entity.notes,
      totalEvents: entity.totalEvents,
      totalSpent: entity.totalSpent,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }
}
```

---

## 📅 Event Models

### EventStatus

```dart
/// Estado de un evento
enum EventStatus {
  quoted('Cotizado'),
  confirmed('Confirmado'),
  completed('Completado'),
  cancelled('Cancelado');

  final String label;
  const EventStatus(this.label);

  factory EventStatus.fromString(String value) {
    return EventStatus.values.firstWhere(
      (status) => status.name == value,
      orElse: () => EventStatus.quoted,
    );
  }

  /// Obtiene el color asociado al estado
  Color get color {
    switch (this) {
      case EventStatus.quoted:
        return Colors.grey;
      case EventStatus.confirmed:
        return Colors.green;
      case EventStatus.completed:
        return Colors.blue;
      case EventStatus.cancelled:
        return Colors.red;
    }
  }
}
```

### EventEntity

```dart
/// Entidad de evento del dominio
class EventEntity {
  final String id;
  final String userId;
  final String clientId;
  final DateTime eventDate;
  final String? startTime;
  final String? endTime;
  final String serviceType;
  final int numPeople;
  final EventStatus status;
  final double discount;
  final bool requiresInvoice;
  final double taxRate;
  final double taxAmount;
  final double totalAmount;
  final String? location;
  final String? city;
  final double? depositPercent;
  final double? cancellationDays;
  final double? refundPercent;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Datos relacionados (opcional, cargados lazy)
  final ClientEntity? client;
  final List<EventProductEntity>? products;
  final List<EventExtraEntity>? extras;
  final List<PaymentEntity>? payments;

  const EventEntity({
    required this.id,
    required this.userId,
    required this.clientId,
    required this.eventDate,
    this.startTime,
    this.endTime,
    required this.serviceType,
    required this.numPeople,
    required this.status,
    required this.discount,
    required this.requiresInvoice,
    required this.taxRate,
    required this.taxAmount,
    required this.totalAmount,
    this.location,
    this.city,
    this.depositPercent,
    this.cancellationDays,
    this.refundPercent,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.client,
    this.products,
    this.extras,
    this.payments,
  });

  /// Calcula el subtotal sin IVA
  double get subtotal {
    return totalAmount - taxAmount;
  }

  /// Calcula el monto del anticipo
  double? get depositAmount {
    if (depositPercent == null) return null;
    return totalAmount * (depositPercent! / 100);
  }

  /// Calcula el saldo pendiente
  double get pendingAmount {
    final paidAmount = payments?.fold<double>(
      0,
      (sum, payment) => sum + payment.amount,
    ) ?? 0;
    return totalAmount - paidAmount;
  }

  /// Verifica si el evento está completamente pagado
  bool get isFullyPaid {
    return pendingAmount <= 0;
  }

  /// Formatea la fecha y hora del evento
  String get formattedDateTime {
    final timeRange = startTime != null && endTime != null
        ? '$startTime - $endTime'
        : startTime ?? endTime ?? 'Horario por definir';
    return '${DateFormat('d MMMM yyyy', 'es').format(eventDate)} • $timeRange';
  }

  /// Copia el evento con algunos campos actualizados
  EventEntity copyWith({
    String? id,
    String? userId,
    String? clientId,
    DateTime? eventDate,
    String? startTime,
    String? endTime,
    String? serviceType,
    int? numPeople,
    EventStatus? status,
    double? discount,
    bool? requiresInvoice,
    double? taxRate,
    double? taxAmount,
    double? totalAmount,
    String? location,
    String? city,
    double? depositPercent,
    double? cancellationDays,
    double? refundPercent,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
    ClientEntity? client,
    List<EventProductEntity>? products,
    List<EventExtraEntity>? extras,
    List<PaymentEntity>? payments,
  }) {
    return EventEntity(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      clientId: clientId ?? this.clientId,
      eventDate: eventDate ?? this.eventDate,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      serviceType: serviceType ?? this.serviceType,
      numPeople: numPeople ?? this.numPeople,
      status: status ?? this.status,
      discount: discount ?? this.discount,
      requiresInvoice: requiresInvoice ?? this.requiresInvoice,
      taxRate: taxRate ?? this.taxRate,
      taxAmount: taxAmount ?? this.taxAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      location: location ?? this.location,
      city: city ?? this.city,
      depositPercent: depositPercent ?? this.depositPercent,
      cancellationDays: cancellationDays ?? this.cancellationDays,
      refundPercent: refundPercent ?? this.refundPercent,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      client: client ?? this.client,
      products: products ?? this.products,
      extras: extras ?? this.extras,
      payments: payments ?? this.payments,
    );
  }
}
```

### EventModel

```dart
/// Modelo de evento para API/Storage
class EventModel {
  final String id;
  final String userId;
  final String clientId;
  final String eventDate;
  final String? startTime;
  final String? endTime;
  final String serviceType;
  final int numPeople;
  final String status;
  final double discount;
  final bool requiresInvoice;
  final double taxRate;
  final double taxAmount;
  final double totalAmount;
  final String? location;
  final String? city;
  final double? depositPercent;
  final double? cancellationDays;
  final double? refundPercent;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Datos relacionados (opcional)
  final Map<String, dynamic>? clients;

  EventModel({
    required this.id,
    required this.userId,
    required this.clientId,
    required this.eventDate,
    this.startTime,
    this.endTime,
    required this.serviceType,
    required this.numPeople,
    required this.status,
    required this.discount,
    required this.requiresInvoice,
    required this.taxRate,
    required this.taxAmount,
    required this.totalAmount,
    this.location,
    this.city,
    this.depositPercent,
    this.cancellationDays,
    this.refundPercent,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.clients,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    return EventModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      clientId: json['client_id'] as String,
      eventDate: json['event_date'] as String,
      startTime: json['start_time'] as String?,
      endTime: json['end_time'] as String?,
      serviceType: json['service_type'] as String,
      numPeople: json['num_people'] as int,
      status: json['status'] as String,
      discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
      requiresInvoice: json['requires_invoice'] as bool? ?? false,
      taxRate: (json['tax_rate'] as num?)?.toDouble() ?? 16.0,
      taxAmount: (json['tax_amount'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      location: json['location'] as String?,
      city: json['city'] as String?,
      depositPercent: (json['deposit_percent'] as num?)?.toDouble(),
      cancellationDays: (json['cancellation_days'] as num?)?.toDouble(),
      refundPercent: (json['refund_percent'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      clients: json['clients'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'client_id': clientId,
      'event_date': eventDate,
      'start_time': startTime,
      'end_time': endTime,
      'service_type': serviceType,
      'num_people': numPeople,
      'status': status,
      'discount': discount,
      'requires_invoice': requiresInvoice,
      'tax_rate': taxRate,
      'tax_amount': taxAmount,
      'total_amount': totalAmount,
      'location': location,
      'city': city,
      'deposit_percent': depositPercent,
      'cancellation_days': cancellationDays,
      'refund_percent': refundPercent,
      'notes': notes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  EventEntity toEntity() {
    return EventEntity(
      id: id,
      userId: userId,
      clientId: clientId,
      eventDate: DateTime.parse(eventDate),
      startTime: startTime,
      endTime: endTime,
      serviceType: serviceType,
      numPeople: numPeople,
      status: EventStatus.fromString(status),
      discount: discount,
      requiresInvoice: requiresInvoice,
      taxRate: taxRate,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      location: location,
      city: city,
      depositPercent: depositPercent,
      cancellationDays: cancellationDays,
      refundPercent: refundPercent,
      notes: notes,
      createdAt: createdAt,
      updatedAt: updatedAt,
      client: clients != null
          ? ClientModel.fromJson(clients!).toEntity()
          : null,
    );
  }

  static EventModel fromEntity(EventEntity entity) {
    return EventModel(
      id: entity.id,
      userId: entity.userId,
      clientId: entity.clientId,
      eventDate: entity.eventDate.toIso8601String(),
      startTime: entity.startTime,
      endTime: entity.endTime,
      serviceType: entity.serviceType,
      numPeople: entity.numPeople,
      status: entity.status.name,
      discount: entity.discount,
      requiresInvoice: entity.requiresInvoice,
      taxRate: entity.taxRate,
      taxAmount: entity.taxAmount,
      totalAmount: entity.totalAmount,
      location: entity.location,
      city: entity.city,
      depositPercent: entity.depositPercent,
      cancellationDays: entity.cancellationDays,
      refundPercent: entity.refundPercent,
      notes: entity.notes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }
}
```

### EventProductEntity

```dart
/// Entidad de producto en evento
class EventProductEntity {
  final String id;
  final String eventId;
  final String productId;
  final String? productName;
  final double quantity;
  final double unitPrice;
  final double discount;
  final double? totalPrice;
  final DateTime createdAt;

  const EventProductEntity({
    required this.id,
    required this.eventId,
    required this.productId,
    this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.discount,
    this.totalPrice,
    required this.createdAt,
  });

  /// Calcula el total del producto
  double get calculatedTotal {
    return (unitPrice - discount) * quantity;
  }

  /// Calcula el subtotal con descuento
  double get subtotalWithDiscount {
    return (unitPrice - discount) * quantity;
  }
}
```

### EventExtraEntity

```dart
/// Entidad de extra en evento
class EventExtraEntity {
  final String id;
  final String eventId;
  final String description;
  final double cost;
  final double price;
  final bool excludeUtility;
  final DateTime createdAt;

  const EventExtraEntity({
    required this.id,
    required this.eventId,
    required this.description,
    required this.cost,
    required this.price,
    required this.excludeUtility,
    required this.createdAt,
  });

  /// Calcula el margen (profit)
  double get profit {
    return excludeUtility ? 0 : (price - cost);
  }

  /// Calcula el margen en porcentaje
  double get profitMargin {
    return excludeUtility ? 0 : ((price - cost) / price * 100);
  }
}
```

### PaymentEntity

```dart
/// Entidad de pago
class PaymentEntity {
  final String id;
  final String eventId;
  final String userId;
  final double amount;
  final DateTime paymentDate;
  final String paymentMethod; // 'cash', 'transfer', 'card', etc.
  final String? notes;
  final DateTime createdAt;

  const PaymentEntity({
    required this.id,
    required this.eventId,
    required this.userId,
    required this.amount,
    required this.paymentDate,
    required this.paymentMethod,
    this.notes,
    required this.createdAt,
  });

  /// Formatea el monto como moneda
  String get amountFormatted {
    return NumberFormat.currency(
      locale: 'es_MX',
      symbol: '\$',
      decimalDigits: 2,
    ).format(amount);
  }

  /// Obtiene el label del método de pago
  String get paymentMethodLabel {
    switch (paymentMethod) {
      case 'cash':
        return 'Efectivo';
      case 'transfer':
        return 'Transferencia';
      case 'card':
        return 'Tarjeta';
      case 'check':
        return 'Cheque';
      default:
        return paymentMethod;
    }
  }
}
```

---

## 📦 Product Models

### ProductEntity

```dart
/// Entidad de producto del dominio
class ProductEntity {
  final String id;
  final String userId;
  final String name;
  final String category;
  final double basePrice;
  final Map<String, dynamic>? recipe;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Datos relacionados (opcional)
  final List<ProductIngredientEntity>? ingredients;

  const ProductEntity({
    required this.id,
    required this.userId,
    required this.name,
    required this.category,
    required this.basePrice,
    this.recipe,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.ingredients,
  });

  /// Calcula el costo total de los ingredientes
  double get totalIngredientCost {
    if (ingredients == null || ingredients!.isEmpty) return 0;
    return ingredients!.fold<double>(
      0,
      (sum, ing) => sum + (ing.estimatedCost ?? 0),
    );
  }

  /// Calcula el margen (profit)
  double get profit {
    return basePrice - totalIngredientCost;
  }

  /// Calcula el margen en porcentaje
  double get profitMargin {
    return basePrice > 0 ? (profit / basePrice * 100) : 0;
  }

  /// Formatea el precio como moneda
  String get priceFormatted {
    return NumberFormat.currency(
      locale: 'es_MX',
      symbol: '\$',
      decimalDigits: 2,
    ).format(basePrice);
  }
}
```

### ProductIngredientEntity

```dart
/// Entidad de ingrediente en producto
class ProductIngredientEntity {
  final String id;
  final String productId;
  final String inventoryId;
  final String? ingredientName;
  final String? unit;
  final double quantityRequired;
  final double? unitCost;
  final DateTime createdAt;

  const ProductIngredientEntity({
    required this.id,
    required this.productId,
    required this.inventoryId,
    this.ingredientName,
    this.unit,
    required this.quantityRequired,
    this.unitCost,
    required this.createdAt,
  });

  /// Calcula el costo estimado
  double? get estimatedCost {
    if (unitCost == null) return null;
    return quantityRequired * unitCost!;
  }

  /// Formatea el costo
  String get costFormatted {
    if (estimatedCost == null) return 'N/A';
    return NumberFormat.currency(
      locale: 'es_MX',
      symbol: '\$',
      decimalDigits: 2,
    ).format(estimatedCost!);
  }
}
```

---

## 📦 Inventory Models

### InventoryType

```dart
/// Tipo de ítem de inventario
enum InventoryType {
  ingredient('Ingrediente'),
  equipment('Equipo');

  final String label;
  const InventoryType(this.label);

  factory InventoryType.fromString(String value) {
    return InventoryType.values.firstWhere(
      (type) => type.name == value,
      orElse: () => InventoryType.ingredient,
    );
  }
}
```

### InventoryItemEntity

```dart
/// Entidad de ítem de inventario
class InventoryItemEntity {
  final String id;
  final String userId;
  final String ingredientName;
  final double currentStock;
  final double minimumStock;
  final String unit;
  final double? unitCost;
  final InventoryType type;
  final DateTime lastUpdated;

  const InventoryItemEntity({
    required this.id,
    required this.userId,
    required this.ingredientName,
    required this.currentStock,
    required this.minimumStock,
    required this.unit,
    this.unitCost,
    required this.type,
    required this.lastUpdated,
  });

  /// Verifica si el stock está bajo
  bool get isLowStock {
    return currentStock <= minimumStock;
  }

  /// Calcula el porcentaje de stock
  double get stockPercentage {
    if (minimumStock == 0) return 100;
    return (currentStock / minimumStock) * 100;
  }

  /// Obtiene el estado del stock
  StockStatus get stockStatus {
    if (currentStock <= minimumStock * 0.5) {
      return StockStatus.critical;
    } else if (currentStock <= minimumStock) {
      return StockStatus.low;
    } else {
      return StockStatus.ok;
    }
  }

  /// Formatea el stock con unidad
  String get stockFormatted {
    return '$currentStock $unit';
  }

  /// Calcula el costo total del stock actual
  double? get totalStockCost {
    if (unitCost == null) return null;
    return currentStock * unitCost!;
  }
}

/// Estado del stock
enum StockStatus {
  ok('OK'),
  low('Bajo'),
  critical('Crítico');

  final String label;
  const StockStatus(this.label);

  /// Obtiene el color del estado
  Color get color {
    switch (this) {
      case StockStatus.ok:
        return Colors.green;
      case StockStatus.low:
        return Colors.orange;
      case StockStatus.critical:
        return Colors.red;
    }
  }
}
```

---

## 📊 Dashboard Models

### DashboardStatsEntity

```dart
/// Entidad de estadísticas del dashboard
class DashboardStatsEntity {
  final double netSales;
  final double cashCollected;
  final double cashAppliedToMonth;
  final double vatCollected;
  final double vatOutstanding;
  final int eventsThisMonth;
  final int lowStockCount;
  final Map<String, int> eventsByStatus;
  final List<EventEntity> upcomingEvents;

  const DashboardStatsEntity({
    required this.netSales,
    required this.cashCollected,
    required this.cashAppliedToMonth,
    required this.vatCollected,
    required this.vatOutstanding,
    required this.eventsThisMonth,
    required this.lowStockCount,
    required this.eventsByStatus,
    required this.upcomingEvents,
  });

  /// Calcula el porcentaje de IVA cobrado
  double get vatCollectedPercentage {
    final totalVat = vatCollected + vatOutstanding;
    return totalVat > 0 ? (vatCollected / totalVat * 100) : 0;
  }
}
```

---

## 🔍 Search Models

### SearchResultEntity

```dart
/// Entidad de resultado de búsqueda
class SearchResultEntity {
  final List<ClientEntity> clients;
  final List<EventEntity> events;
  final List<ProductEntity> products;
  final List<InventoryItemEntity> inventory;

  const SearchResultEntity({
    required this.clients,
    required this.events,
    required this.products,
    required this.inventory,
  });

  /// Total de resultados
  int get totalResults {
    return clients.length + events.length + products.length + inventory.length;
  }

  /// Verifica si hay resultados
  bool get hasResults => totalResults > 0;
}
```

---

## 📄 Extensiones Útiles

### Number Extensions

```dart
extension NumberExtensions on num {
  /// Formatea como moneda MXN
  String toCurrencyMXN() {
    return NumberFormat.currency(
      locale: 'es_MX',
      symbol: '\$',
      decimalDigits: 2,
    ).format(toDouble());
  }

  /// Formatea como porcentaje
  String toPercentage({int decimalDigits = 1}) {
    return NumberFormat.percentPattern(
      locale: 'es_MX',
      decimalDigits: decimalDigits,
    ).format(toDouble());
  }
}
```

### String Extensions

```dart
extension StringExtensions on String {
  /// Capitaliza la primera letra
  String capitalize() {
    if (isEmpty) return this;
    return this[0].toUpperCase() + substring(1);
  }

  /// Capitaliza cada palabra
  String titleCase() {
    return split(' ')
        .map((word) => word.capitalize())
        .join(' ');
  }

  /// Verifica si es un email válido
  bool get isValidEmail {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(this);
  }

  /// Verifica si es un teléfono válido
  bool get isValidPhone {
    return RegExp(r'^\+?[\d\s\-\(\)]+$').hasMatch(this);
  }
}
```

---

## 📝 Notas sobre JSON Serialization

Para usar `json_serializable` con `build_runner`:

1. Agregar `@JsonSerializable()` a la clase Model
2. Ejecutar `flutter pub run build_runner build`
3. Se generará un archivo `.g.dart` con los métodos `fromJson` y `toJson`

**Ejemplo:**

```dart
@JsonSerializable()
class ClientModel {
  final String id;
  final String name;
  // ... otros campos

  ClientModel({
    required this.id,
    required this.name,
    // ...
  });

  factory ClientModel.fromJson(Map<String, dynamic> json) =>
      _$ClientModelFromJson(json);

  Map<String, dynamic> toJson() => _$ClientModelToJson(this);
}
```
