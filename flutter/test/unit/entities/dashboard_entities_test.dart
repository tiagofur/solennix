import 'package:flutter_test/flutter_test.dart';
import 'package:eventosapp/features/dashboard/domain/entities/dashboard_entities.dart';

void main() {
  group('Dashboard Entities', () {
    test('DashboardKPIMetrics calculations', () {
      const metrics = DashboardKPIMetrics(
        totalSales: 10000,
        totalCollected: 6000,
      );

      expect(metrics.collectionRate, equals(60));
      expect(metrics.pendingAmount, equals(4000));
    });

    test('EventSummary pendingAmount and isUpcoming', () {
      final event = EventSummary(
        id: 'e1',
        clientName: 'Cliente',
        eventName: 'Evento',
        eventDate: DateTime.now().add(const Duration(days: 1)),
        totalAmount: 5000,
        collectedAmount: 2000,
        status: 'confirmed',
      );

      expect(event.pendingAmount, equals(3000));
      expect(event.isUpcoming, isTrue);
    });

    test('InventoryAlert critical and stockLevel', () {
      final alert = InventoryAlert(
        id: 'i1',
        itemName: 'Azucar',
        currentStock: 10,
        minStock: 50,
        unit: 'kg',
        eventsAffected: 2,
      );

      expect(alert.stockLevel, equals(20));
      expect(alert.isCritical, isTrue);
    });

    test('MonthlyRevenue margin', () {
      final revenue = MonthlyRevenue(
        month: 'Ene',
        revenue: 10000,
        expenses: 7000,
        profit: 3000,
      );

      expect(revenue.margin, equals(30));
    });
  });
}
