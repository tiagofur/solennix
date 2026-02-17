import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/config/theme.dart';
import 'package:eventosapp/config/colors.dart';
import 'package:eventosapp/config/spacing.dart';
import 'package:eventosapp/features/dashboard/presentation/providers/dashboard_state.dart';
import 'package:eventosapp/features/dashboard/domain/entities/dashboard_stats_entity.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardState = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        backgroundColor: AppColors.brand,
        foregroundColor: AppColors.white,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () {
            ref.read(dashboardProvider.notifier).refresh();
          },
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (dashboardState.status == DashboardStatus.loading)
                  const Center(
                    child: CircularProgressIndicator(),
                  )
                else if (dashboardState.status == DashboardStatus.error)
                  Padding(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        child: Column(
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 48,
                              color: AppColors.error,
                            ),
                            SizedBox(height: AppSpacing.md),
                            Text(
                              'Error al cargar estadísticas',
                              style: AppTextStyles.bodyLarge,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else if (dashboardState.stats != null) ..._buildContent(context, dashboardState.stats!),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, DashboardStatsEntity stats) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildKPIs(context, stats),
        SizedBox(height: AppSpacing.xl),
        _buildSectionTitle('Próximos Eventos'),
        SizedBox(height: AppSpacing.md),
        _buildEventsByStatus(stats.eventsByStatus),
      ],
    );
  }

  Widget _buildKPIs(BuildContext context, DashboardStatsEntity stats) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _KPICard(
                icon: Icons.attach_money,
                label: 'Ventas Netas',
                value: stats.netSalesFormatted,
                iconColor: AppColors.success,
              ),
            ),
            SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _KPICard(
                icon: Icons.payments,
                label: 'Cobrado',
                value: stats.cashCollectedFormatted,
                iconColor: AppColors.brand,
              ),
            ),
            SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _KPICard(
                icon: Icons.receipt_long,
                label: 'IVA Cobrado',
                value: stats.vatCollectedFormatted,
                iconColor: AppColors.info,
              ),
            ),
            SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _KPICard(
                icon: Icons.pending_actions,
                label: 'IVA Pendiente',
                value: stats.vatOutstandingFormatted,
                iconColor: AppColors.warning,
              ),
            ),
          ],
        ),
        SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _KPICard(
                icon: Icons.event,
                label: 'Eventos del Mes',
                value: stats.eventsThisMonth.toString(),
                iconColor: AppColors.info,
              ),
            ),
            SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _KPICard(
                icon: Icons.inventory,
                label: 'Stock Bajo',
                value: stats.lowStockCount.toString(),
                iconColor: AppColors.warning,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _KPICard({
    required IconData icon,
    required String label,
    required String value,
    required Color iconColor,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon,
                    size: 24,
                    color: AppColors.white,
                  ),
                ),
                SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        label,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.gray500,
                        ),
                      ),
                      Text(
                        value,
                        style: AppTextStyles.h3.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Text(
        title,
        style: AppTextStyles.h3.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildEventsByStatus(Map<String, int> eventsByStatus) {
    return Column(
      children: eventsByStatus.entries.map((entry) {
        final status = entry.key;
        final count = entry.value;
        final color = _getStatusColor(status);

        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            status,
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '$count eventos',
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.gray500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Cotizado':
        return AppColors.gray400;
      case 'Confirmado':
        return AppColors.success;
      case 'Completado':
        return AppColors.info;
      case 'Cancelado':
        return AppColors.error;
      default:
        return AppColors.gray500;
    }
  }
}
