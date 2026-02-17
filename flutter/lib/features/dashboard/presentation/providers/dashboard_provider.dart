import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dashboard_state.dart';
import 'package:eventosapp/features/dashboard/domain/repositories/dashboard_repository.dart';
import 'package:eventosapp/features/dashboard/data/data_sources/dashboard_remote_data_source.dart';
import 'package:eventosapp/core/api/api_client_provider.dart';

final dashboardProvider = AsyncNotifierProvider<DashboardNotifier, DashboardState>(
  () => DashboardNotifier(),
);

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final remoteDataSource = ref.watch(dashboardRemoteDataSourceProvider);
  return DashboardRepository(remoteDataSource: remoteDataSource);
});

final dashboardRemoteDataSourceProvider =
    Provider<DashboardRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardRemoteDataSource(apiClient: apiClient);
});

class DashboardNotifier extends AsyncNotifier<DashboardState> {
  late final DashboardRepository _repository;

  Future<void> loadDashboardMetrics() async {
    state = const AsyncLoading();
    try {
      final metrics = await _repository.getDashboardMetrics();
      state = AsyncData(DashboardState().loaded(metrics));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> refresh() async {
    await loadDashboardMetrics();
  }

  @override
  DashboardState build() {
    _repository = ref.watch(dashboardRepositoryProvider);
    loadDashboardMetrics();
    return const DashboardState(isLoading: true);
  }
}
