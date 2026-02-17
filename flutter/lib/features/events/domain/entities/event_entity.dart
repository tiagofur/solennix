import 'package:eventosapp/features/events/data/models/event_models.dart';

class EventEntity {
  final String id;
  final String clientId;
  final String clientName;
  final DateTime eventDate;
  final String startTime;
  final String endTime;
  final String location;
  final String? city;
  final String serviceType;
  final int numPeople;
  final String? notes;
  final double totalAmount;
  final double discount;
  final bool requiresInvoice;
  final double taxRate;
  final double taxAmount;
  final double depositPercent;
  final double cancellationDays;
  final double refundPercent;
  final String status;
  final List<Payment> payments;
  final DateTime createdAt;
  final DateTime updatedAt;

  const EventEntity({
    required this.id,
    required this.clientId,
    required this.clientName,
    required this.eventDate,
    required this.startTime,
    required this.endTime,
    required this.location,
    this.city,
    required this.serviceType,
    required this.numPeople,
    this.notes,
    this.totalAmount = 0,
    this.discount = 0,
    this.requiresInvoice = false,
    this.taxRate = 0,
    this.taxAmount = 0,
    this.depositPercent = 0,
    this.cancellationDays = 3,
    this.refundPercent = 100,
    required this.status,
    this.payments = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isConfirmed => status == 'confirmed';
  bool get isQuoted => status == 'quoted';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';

  double get collectedAmount => payments.fold(0.0, (sum, payment) => sum + payment.amount);
  double get pendingAmount => totalAmount - collectedAmount;
  double get depositAmount => totalAmount * (depositPercent / 100);
  double get remainingDeposit => depositAmount - collectedAmount;

  factory EventEntity.fromModel(EventModel model) {
    return EventEntity(
      id: model.id,
      clientId: model.clientId,
      clientName: model.clientName,
      eventDate: model.eventDate,
      startTime: model.startTime,
      endTime: model.endTime,
      location: model.location,
      city: model.city,
      serviceType: model.serviceType,
      numPeople: model.numPeople,
      notes: model.notes,
      totalAmount: model.totalAmount,
      discount: model.discount,
      requiresInvoice: model.requiresInvoice,
      taxRate: model.taxRate,
      taxAmount: model.taxAmount,
      depositPercent: model.depositPercent,
      cancellationDays: model.cancellationDays,
      refundPercent: model.refundPercent,
      status: model.status,
      payments: model.payments
          .map((p) => Payment(
                id: p.id,
                eventId: p.eventId,
                paymentDate: p.paymentDate,
                amount: p.amount,
                method: p.paymentMethod,
                notes: p.notes,
              ))
          .toList(),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }
}

class Payment {
  final String id;
  final String eventId;
  final DateTime paymentDate;
  final double amount;
  final String? method;
  final String? notes;

  const Payment({
    required this.id,
    required this.eventId,
    required this.paymentDate,
    required this.amount,
    this.method,
    this.notes,
  });
}
