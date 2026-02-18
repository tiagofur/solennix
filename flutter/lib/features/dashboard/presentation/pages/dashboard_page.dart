import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/features/dashboard/presentation/providers/dashboard_provider.dart';
import 'package:eventosapp/shared/widgets/error_widget.dart' as app_widgets;
import 'package:eventosapp/shared/widgets/refresh_indicator_widget.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/features/dashboard/presentation/widgets/kpi_card.dart';
import 'package:eventosapp/features/dashboard/presentation/widgets/revenue_chart.dart';
import 'package:eventosapp/features/dashboard/presentation/widgets/event_status_chart.dart';
import 'package:eventosapp/features/dashboard/presentation/widgets/upcoming_events_list.dart';
import 'package:eventosapp/features/dashboard/presentation/widgets/inventory_alerts_list.dart';
import 'package:eventosapp/features/dashboard/domain/entities/dashboard_entities.dart';
import 'package:eventosapp/features/dashboard/presentation/providers/dashboard_state.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(dashboardProvider.notifier).loadDashboardMetrics();
    });
  }

  @override
  Widget build(BuildContext context) {
    final dashboardState = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: const CustomAppBar(title: 'Dashboard'),
      body: RefreshIndicatorWidget(
        onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
        child: dashboardState.isLoading
            ? const Center(child: CircularProgressIndicator())
            : dashboardState.hasError
                ? app_widgets.ErrorWidget(
                    message:
                        dashboardState.error?.toString() ?? 'Ocurrió un error',
                    onRetry: () =>
                        ref.read(dashboardProvider.notifier).refresh(),
                  )
                : _buildDashboardContent(
                    dashboardState.value ?? const DashboardState()),
      ),
    );
  }

  Widget _buildDashboardContent(DashboardState state) {
    final metrics = state.metrics;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (metrics != null) ...[
            _buildHeader(metrics),
            const SizedBox(height: 16),
            _buildKPIsGrid(metrics),
            const SizedBox(height: 16),
            RevenueChart(revenues: state.monthlyRevenues),
            const SizedBox(height: 16),
            EventStatusChart(events: state.upcomingEvents),
            const SizedBox(height: 16),
            UpcomingEventsList(events: state.upcomingEvents),
            if (state.inventoryAlerts.isNotEmpty) ...[
              const SizedBox(height: 16),
              InventoryAlertsList(alerts: state.inventoryAlerts),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildHeader(DashboardKPIMetrics metrics) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bienvenido',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aquí tienes un resumen de tu actividad',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(Icons.calendar_today_outlined,
                    size: 20, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  '${metrics.totalEvents} eventos totales',
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(width: 24),
                Icon(Icons.person_outline, size: 20, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  '${metrics.activeClients} clientes activos',
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKPIsGrid(DashboardKPIMetrics metrics) {
    // Derive IVA pendiente from existing data (proportional to pending collections)
    final vatOutstanding = metrics.totalSales > 0
        ? metrics.totalVAT * (metrics.pendingCollections / metrics.totalSales)
        : 0.0;

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      children: [
        KPICard(
          title: 'Ventas Totales',
          value: metrics.totalSales,
          subtitle: 'Total facturado',
          icon: Icons.attach_money_outlined,
          color: Colors.blue,
          trend: metrics.salesGrowth > 0
              ? '+${metrics.salesGrowth.toStringAsFixed(1)}%'
              : '${metrics.salesGrowth.toStringAsFixed(1)}%',
          isCurrency: true,
        ),
        KPICard(
          title: 'Cobrado',
          value: metrics.totalCollected,
          subtitle: '${metrics.collectionRate.toStringAsFixed(0)}% recaudado',
          icon: Icons.account_balance_wallet_outlined,
          color: Colors.green,
          isCurrency: true,
        ),
        KPICard(
          title: 'Pendiente',
          value: metrics.pendingCollections,
          subtitle: '${metrics.pendingPayments} pagos',
          icon: Icons.pending_outlined,
          color: Colors.orange,
          isCurrency: true,
        ),
        KPICard(
          title: 'IVA Total',
          value: metrics.totalVAT,
          subtitle: '16% de ventas',
          icon: Icons.receipt_long_outlined,
          color: Colors.purple,
          isCurrency: true,
        ),
        KPICard(
          title: 'Próximos Eventos',
          value: metrics.upcomingEvents.toDouble(),
          subtitle: 'Pendientes de realizar',
          icon: Icons.calendar_month_outlined,
          color: const Color(0xFFFF6B35),
        ),
        KPICard(
          title: 'IVA Pendiente',
          value: vatOutstanding,
          subtitle: 'Proporcional a cobros pendientes',
          icon: Icons.warning_amber_outlined,
          color: Colors.red,
          isCurrency: true,
        ),
      ],
    );
  }
}
