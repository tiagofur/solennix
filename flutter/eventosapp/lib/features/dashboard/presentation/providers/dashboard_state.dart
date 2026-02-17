import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/features/dashboard/domain/entities/dashboard_stats_entity.dart';

enum DashboardStatus {
  initial,
  loading,
  loaded,
  error,
}

class DashboardState {
  final DashboardStatus status;
  final DashboardStatsEntity? stats;
  final String? errorMessage;

  const DashboardState({
    required this.status,
    this.stats,
    this.errorMessage,
  });

  factory DashboardState.initial() =>
      const DashboardState(status: DashboardStatus.initial);
  factory DashboardState.loading() =>
      const DashboardState(status: DashboardStatus.loading);
  factory DashboardState.loaded(DashboardStatsEntity stats) =>
      DashboardState(status: DashboardStatus.loaded, stats: stats);
  factory DashboardState.error(String message) =>
      DashboardState(status: DashboardStatus.error, errorMessage: message);
}
