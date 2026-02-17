import 'package:eventosapp/core/api/api_client.dart';
import 'package:eventosapp/config/api_config.dart';

class DashboardRemoteDataSource {
  final ApiClient _apiClient;

  DashboardRemoteDataSource({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  Future<Map<String, dynamic>> getDashboardMetrics() async {
    final statsResponse = await _apiClient.get('${ApiConfig.dashboard}/stats');
    final statsData = statsResponse.data as Map<String, dynamic>;

    final upcomingEventsResponse =
        await _apiClient.get('${ApiConfig.events}/upcoming', queryParameters: {'limit': 5});
    final upcomingEventsData = (upcomingEventsResponse.data as List<dynamic>)
        .map((e) => e as Map<String, dynamic>)
        .toList();

    final inventoryResponse = await _apiClient.get(
      ApiConfig.inventory,
      queryParameters: {'low_stock': true},
    );
    final inventoryData = (inventoryResponse.data as List<dynamic>)
        .map((e) => e as Map<String, dynamic>)
        .toList();

    final paymentsData = await _getPaymentsForLastSixMonths();

    final totalSales = (statsData['net_sales'] as num?)?.toDouble() ?? 0;
    final totalCollected = (statsData['cash_collected'] as num?)?.toDouble() ?? 0;
    final totalVAT = (statsData['vat_collected'] as num?)?.toDouble() ?? 0;
    final totalEvents = (statsData['events_this_month'] as num?)?.toInt() ?? 0;
    final lowStockItems = (statsData['low_stock_count'] as num?)?.toInt() ?? 0;
    final salesGrowth = (statsData['sales_growth'] as num?)?.toDouble() ?? 0;
    final activeClients = (statsData['active_clients'] as num?)?.toInt() ?? 0;

    final upcomingEventsList = upcomingEventsData.map((event) {
      final client = event['clients'] as Map<String, dynamic>?;
      final eventDate = event['event_date']?.toString() ?? '';
      final totalAmount = (event['total_amount'] as num?)?.toDouble() ?? 0;
      final collectedAmount = _calculateCollectedAmountForEvent(
        eventId: event['id']?.toString() ?? '',
        payments: paymentsData,
      );
      return {
        'id': event['id']?.toString() ?? '',
        'client_name': client?['name']?.toString() ?? 'Cliente',
        'event_name': event['service_type']?.toString() ?? 'Evento',
        'event_date': eventDate,
        'total_amount': totalAmount,
        'collected_amount': collectedAmount,
        'status': event['status']?.toString() ?? 'quoted',
        'location': event['location']?.toString(),
      };
    }).toList();

    final inventoryAlerts = inventoryData.map((item) {
      return {
        'id': item['id']?.toString() ?? '',
        'item_name': item['ingredient_name']?.toString() ?? 'Item',
        'current_stock': (item['current_stock'] as num?)?.toDouble() ?? 0,
        'min_stock': (item['minimum_stock'] as num?)?.toDouble() ?? 0,
        'unit': item['unit']?.toString() ?? '',
        'events_affected': 0,
      };
    }).toList();

    final pendingPaymentsCount = upcomingEventsList
        .where((event) => (event['total_amount'] as double) > (event['collected_amount'] as double))
        .length;

    return {
      'total_sales': totalSales,
      'total_collected': totalCollected,
      'pending_collections': totalSales - totalCollected,
      'total_vat': totalVAT,
      'total_events': totalEvents,
      'upcoming_events': upcomingEventsList.length,
      'pending_payments': pendingPaymentsCount,
      'low_stock_items': lowStockItems,
      'sales_growth': salesGrowth,
      'active_clients': activeClients,
      'upcoming_events_list': upcomingEventsList,
      'inventory_alerts': inventoryAlerts,
      'monthly_revenues': paymentsData,
    };
  }

  Future<List<Map<String, dynamic>>> _getPaymentsForLastSixMonths() async {
    final now = DateTime.now();
    final startMonth = DateTime(now.year, now.month - 5, 1);
    final endMonth = DateTime(now.year, now.month + 1, 0);

    final paymentsResponse = await _apiClient.get(
      ApiConfig.payments,
      queryParameters: {
        'start': startMonth.toIso8601String().split('T').first,
        'end': endMonth.toIso8601String().split('T').first,
      },
    );

    final paymentsData = (paymentsResponse.data as List<dynamic>)
        .map((e) => e as Map<String, dynamic>)
        .toList();

    final months = _buildMonthBuckets(startMonth, 6);
    for (final payment in paymentsData) {
      final dateString = payment['payment_date']?.toString();
      if (dateString == null) continue;
      final date = DateTime.tryParse(dateString);
      if (date == null) continue;
      final key = '${date.year}-${date.month.toString().padLeft(2, '0')}';
      if (!months.containsKey(key)) continue;
      final amount = (payment['amount'] as num?)?.toDouble() ?? 0;
      months[key] = (months[key] ?? 0) + amount;
    }

    return _buildMonthlyRevenueList(months);
  }

  Map<String, double> _buildMonthBuckets(DateTime startMonth, int count) {
    final buckets = <String, double>{};
    for (var i = 0; i < count; i++) {
      final date = DateTime(startMonth.year, startMonth.month + i, 1);
      final key = '${date.year}-${date.month.toString().padLeft(2, '0')}';
      buckets[key] = 0;
    }
    return buckets;
  }

  List<Map<String, dynamic>> _buildMonthlyRevenueList(Map<String, double> buckets) {
    final monthNames = <int, String>{
      1: 'Ene',
      2: 'Feb',
      3: 'Mar',
      4: 'Abr',
      5: 'May',
      6: 'Jun',
      7: 'Jul',
      8: 'Ago',
      9: 'Sep',
      10: 'Oct',
      11: 'Nov',
      12: 'Dic',
    };

    return buckets.entries.map((entry) {
      final parts = entry.key.split('-');
      final month = int.tryParse(parts[1]) ?? 1;
      final label = monthNames[month] ?? entry.key;
      final revenue = entry.value;
      return {
        'month': label,
        'revenue': revenue,
        'expenses': 0.0,
        'profit': revenue,
      };
    }).toList();
  }

  double _calculateCollectedAmountForEvent({
    required String eventId,
    required List<Map<String, dynamic>> payments,
  }) {
    if (eventId.isEmpty) return 0;
    return payments.fold(0.0, (sum, payment) {
      final paymentEventId = payment['event_id']?.toString() ?? '';
      if (paymentEventId != eventId) return sum;
      final amount = (payment['amount'] as num?)?.toDouble() ?? 0;
      return sum + amount;
    });
  }
}
