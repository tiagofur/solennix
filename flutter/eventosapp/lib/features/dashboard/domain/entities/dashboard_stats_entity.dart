import 'package:intl/intl.dart';

class DashboardStatsEntity {
  final double netSales;
  final double cashCollected;
  final double cashAppliedToMonth;
  final double vatCollected;
  final double vatOutstanding;
  final int eventsThisMonth;
  final int lowStockCount;
  final Map<String, int> eventsByStatus;
  final List<dynamic> upcomingEvents;

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

  String get netSalesFormatted {
    final formatter = NumberFormat.currency(
      locale: const Locale('es', 'MX'),
      symbol: '\$',
      decimalDigits: 2,
    );
    return formatter.format(netSales);
  }

  String get cashCollectedFormatted {
    final formatter = NumberFormat.currency(
      locale: const Locale('es', 'MX'),
      symbol: '\$',
      decimalDigits: 2,
    );
    return formatter.format(cashCollected);
  }

  String get vatCollectedFormatted {
    final formatter = NumberFormat.currency(
      locale: const Locale('es', 'MX'),
      symbol: '\$',
      decimalDigits: 2,
    );
    return formatter.format(vatCollected);
  }

  String get vatOutstandingFormatted {
    final formatter = NumberFormat.currency(
      locale: const Locale('es', 'MX'),
      symbol: '\$',
      decimalDigits: 2,
    );
    return formatter.format(vatOutstanding);
  }
}
