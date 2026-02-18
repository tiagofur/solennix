import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'inventory_state.dart';
import '../../data/repositories/inventory_repository.dart';
import '../../data/data_sources/inventory_remote_data_source.dart';
import 'package:eventosapp/core/api/api_client_provider.dart';

final inventoryProvider =
    AsyncNotifierProvider<InventoryNotifier, InventoryState>(
  () => InventoryNotifier(),
);

final inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  final remoteDataSource = ref.watch(inventoryRemoteDataSourceProvider);
  return InventoryRepository(remoteDataSource: remoteDataSource);
});

final inventoryRemoteDataSourceProvider = Provider((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InventoryRemoteDataSource(apiClient: apiClient);
});

class InventoryNotifier extends AsyncNotifier<InventoryState> {
  late final InventoryRepository _repository;

  Future<void> loadInventories({String? type, bool? lowStock}) async {
    state = const AsyncLoading();
    try {
      final inventories =
          await _repository.getInventories(type: type, lowStock: lowStock);
      state = AsyncData(InventoryState().loaded(inventories));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> searchInventories(String query) async {
    final current = state.valueOrNull ?? const InventoryState();
    state = AsyncData(current.copyWith(searchQuery: query));
  }

  Future<void> filterByType(String? type) async {
    final current = state.valueOrNull ?? const InventoryState();
    state = AsyncData(current.copyWith(typeFilter: type));
    await loadInventories(type: type, lowStock: current.lowStockOnly);
  }

  Future<void> toggleLowStockOnly(bool enabled) async {
    final current = state.valueOrNull ?? const InventoryState();
    state = AsyncData(current.copyWith(lowStockOnly: enabled));
    await loadInventories(type: current.typeFilter, lowStock: enabled);
  }

  Future<void> loadInventoryDetail(String id) async {
    try {
      final inventory = await _repository.getInventoryById(id);
      final current = state.valueOrNull ?? const InventoryState();
      state = AsyncData(current.copyWith(selectedInventory: inventory));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> createInventory(Map<String, dynamic> data) async {
    final current = state.valueOrNull ?? const InventoryState();
    state = AsyncData(current.creating());
    try {
      final newInventory = await _repository.createInventory(data);
      final updatedInventories = [...current.inventories, newInventory];
      state = AsyncData(
          current.copyWith(inventories: updatedInventories, isCreating: false));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> updateInventory(String id, Map<String, dynamic> data) async {
    final current = state.valueOrNull ?? const InventoryState();
    state = AsyncData(current.updating());
    try {
      final updatedInventory = await _repository.updateInventory(id, data);
      final updatedInventories = current.inventories.map((inv) {
        return inv.id == id ? updatedInventory : inv;
      }).toList();

      state = AsyncData(
          current.copyWith(inventories: updatedInventories, isUpdating: false));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> deleteInventory(String id) async {
    final current = state.valueOrNull ?? const InventoryState();
    state = AsyncData(current.deleting());
    try {
      await _repository.deleteInventory(id);
      final updatedInventories =
          current.inventories.where((inv) => inv.id != id).toList();
      state = AsyncData(
          current.copyWith(inventories: updatedInventories, isDeleting: false));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> refresh() async {
    final current = state.valueOrNull ?? const InventoryState();
    await loadInventories(
        type: current.typeFilter, lowStock: current.lowStockOnly);
  }

  void clearSelectedInventory() {
    final current = state.valueOrNull ?? const InventoryState();
    state = AsyncData(current.copyWith(selectedInventory: null));
  }

  @override
  InventoryState build() {
    _repository = ref.watch(inventoryRepositoryProvider);
    loadInventories();
    return const InventoryState(isLoading: true);
  }
}
