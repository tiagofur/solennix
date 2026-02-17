import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/features/dashboard/presentation/providers/dashboard_state.dart';

class DashboardNotifier extends StateNotifier<DashboardState> {
  DashboardNotifier() : super(DashboardState.initial());

  Future<void> loadStats() async {
    state = DashboardState.loading();

    try {
      // TODO: Implementar llamada al backend
      // Simulación temporal
      await Future.delayed(const Duration(seconds: 1));

      final stats = DashboardStatsEntity(
        netSales: 150000.00,
        cashCollected: 80000.00,
        cashAppliedToMonth: 75000.00,
        vatCollected: 24000.00,
        vatOutstanding: 8000.00,
        eventsThisMonth: 8,
        lowStockCount: 3,
        eventsByStatus: {
          'Cotizado': 2,
          'Confirmado': 4,
          'Completado': 1,
          'Cancelado': 1,
        },
        upcomingEvents: [],
      );

      state = DashboardState.loaded(stats);
    } catch (e) {
      state = DashboardState.error(e.toString());
    }
  }

  Future<void> refresh() async {
    await loadStats();
  }
}

final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier();
});
