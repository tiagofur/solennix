import '../../domain/entities/inventory_entity.dart';

class InventoryState {
  final List<InventoryItemEntity> inventories;
  final InventoryItemEntity? selectedInventory;
  final String? typeFilter;
  final bool lowStockOnly;
  final String searchQuery;
  final bool isLoading;
  final bool isCreating;
  final bool isUpdating;
  final bool isDeleting;
  final String? errorMessage;

  const InventoryState({
    this.inventories = const [],
    this.selectedInventory,
    this.typeFilter,
    this.lowStockOnly = false,
    this.searchQuery = '',
    this.isLoading = false,
    this.isCreating = false,
    this.isUpdating = false,
    this.isDeleting = false,
    this.errorMessage,
  });

  List<InventoryItemEntity> get filteredInventories {
    if (searchQuery.isEmpty) return inventories;
    final q = searchQuery.toLowerCase();
    return inventories
        .where((item) => item.ingredientName.toLowerCase().contains(q))
        .toList();
  }

  InventoryState copyWith({
    List<InventoryItemEntity>? inventories,
    InventoryItemEntity? selectedInventory,
    String? typeFilter,
    bool? lowStockOnly,
    String? searchQuery,
    bool? isLoading,
    bool? isCreating,
    bool? isUpdating,
    bool? isDeleting,
    String? errorMessage,
  }) {
    return InventoryState(
      inventories: inventories ?? this.inventories,
      selectedInventory: selectedInventory ?? this.selectedInventory,
      typeFilter: typeFilter ?? this.typeFilter,
      lowStockOnly: lowStockOnly ?? this.lowStockOnly,
      searchQuery: searchQuery ?? this.searchQuery,
      isLoading: isLoading ?? this.isLoading,
      isCreating: isCreating ?? this.isCreating,
      isUpdating: isUpdating ?? this.isUpdating,
      isDeleting: isDeleting ?? this.isDeleting,
      errorMessage: errorMessage,
    );
  }

  InventoryState loading() => copyWith(isLoading: true, errorMessage: null);
  InventoryState error(String message) =>
      copyWith(errorMessage: message, isLoading: false);
  InventoryState loaded(List<InventoryItemEntity> inventoriesList) => copyWith(
        inventories: inventoriesList,
        isLoading: false,
        errorMessage: null,
      );
  InventoryState creating() => copyWith(isCreating: true, errorMessage: null);
  InventoryState updating() => copyWith(isUpdating: true, errorMessage: null);
  InventoryState deleting() => copyWith(isDeleting: true, errorMessage: null);
}
