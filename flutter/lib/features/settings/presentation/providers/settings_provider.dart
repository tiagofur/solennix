import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/core/api/api_client_provider.dart';
import 'package:eventosapp/core/storage/local_storage.dart';
import 'package:eventosapp/features/settings/data/data_sources/settings_remote_data_source.dart';
import 'package:eventosapp/features/settings/data/repositories/settings_repository.dart';
import 'package:eventosapp/features/settings/data/models/user_profile_model.dart';
import 'settings_state.dart';

final localStorageProvider = Provider<LocalStorage>((ref) {
  return LocalStorage();
});

final settingsRemoteDataSourceProvider = Provider<SettingsRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SettingsRemoteDataSource(apiClient: apiClient);
});

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  final remoteDataSource = ref.watch(settingsRemoteDataSourceProvider);
  return SettingsRepository(remoteDataSource: remoteDataSource);
});

final settingsProvider = AsyncNotifierProvider<SettingsNotifier, SettingsState>(
  () => SettingsNotifier(),
);

class SettingsNotifier extends AsyncNotifier<SettingsState> {
  late final SettingsRepository _repository;
  late final LocalStorage _localStorage;

  @override
  SettingsState build() {
    _repository = ref.watch(settingsRepositoryProvider);
    _localStorage = ref.watch(localStorageProvider);
    loadProfile();
    return const SettingsState(isLoading: true);
  }

  Future<void> loadProfile() async {
    state = const AsyncLoading();
    try {
      final profile = await _repository.getProfile();
      state = AsyncData(SettingsState().loaded(profile));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> saveProfile(UserProfileModel profile) async {
    final current = state.valueOrNull ?? const SettingsState();
    state = AsyncData(current.saving());
    try {
      final updated = await _repository.updateProfile(profile);
      state = AsyncData(current.loaded(updated));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> saveAppPreferences(Map<String, dynamic> preferences) async {
    await _localStorage.putSettings(preferences);
  }

  Map<String, dynamic>? loadAppPreferences() {
    return _localStorage.getSettings();
  }
}
