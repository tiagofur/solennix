/// Estado de un evento
enum EventStatus {
  quoted('Cotizado'),
  confirmed('Confirmado'),
  completed('Completado'),
  cancelled('Cancelado');

  final String label;
  const EventStatus(this.label);
}

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
  });

  double get subtotal => totalAmount - taxAmount;

  double? get depositAmount {
    if (depositPercent == null) return null;
    return totalAmount * (depositPercent! / 100);
  }

  double get pendingAmount => totalAmount;

  bool get isFullyPaid => pendingAmount <= 0;

  String get formattedDateTime {
    final timeRange = startTime != null && endTime != null
        ? '$startTime - $endTime'
        : startTime ?? endTime ?? 'Horario por definir';
    final monthName = _getMonthName(eventDate.month);
    return '${eventDate.day} de $monthName ${eventDate.year} • $timeRange';
  }

  String _getMonthName(int month) {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre'
    ];
    return months[month - 1];
  }

  String _monthNames(int index) {
    final months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre'
    ];
    return months[index];
  }
}
