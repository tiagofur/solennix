import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'products_state.dart';
import '../../data/repositories/products_repository.dart';
import '../../data/data_sources/products_remote_data_source.dart';
import '../../domain/entities/product_entity.dart';
import 'package:eventosapp/core/api/api_client_provider.dart';

final productsProvider = AsyncNotifierProvider<ProductsNotifier, ProductsState>(
  () => ProductsNotifier(),
);

final productsRepositoryProvider = Provider<ProductsRepository>((ref) {
  final remoteDataSource = ref.watch(productsRemoteDataSourceProvider);
  return ProductsRepository(remoteDataSource: remoteDataSource);
});

final productsRemoteDataSourceProvider = Provider((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ProductsRemoteDataSource(apiClient: apiClient);
});

class ProductsNotifier extends AsyncNotifier<ProductsState> {
  late final ProductsRepository _repository;

  Future<void> loadProducts(
      {String? search, String? category, String? status}) async {
    state = const AsyncLoading();
    try {
      final products = await _repository.getProducts(
          search: search, category: category, status: status);
      state = AsyncData(ProductsState().loaded(products));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> searchProducts(String query) async {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.copyWith(searchQuery: query));
    await loadProducts(
      search: query,
      category: current.categoryFilter,
      status: current.statusFilter,
    );
  }

  Future<void> filterByCategory(String? category) async {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.copyWith(categoryFilter: category));
    await loadProducts(
      search: current.searchQuery,
      category: category,
      status: current.statusFilter,
    );
  }

  Future<void> filterByStatus(String? status) async {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.copyWith(statusFilter: status));
    await loadProducts(
      search: current.searchQuery,
      category: current.categoryFilter,
      status: status,
    );
  }

  Future<void> loadProductDetail(String id) async {
    try {
      final product = await _repository.getProductById(id);
      final current = state.valueOrNull ?? const ProductsState();
      state = AsyncData(current.copyWith(selectedProduct: product));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> createProduct(Map<String, dynamic> data) async {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.creating());
    try {
      final newProduct = await _repository.createProduct(data);
      final updatedProducts = [...current.products, newProduct];
      state = AsyncData(ProductsState().loaded(updatedProducts));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  /// Creates a product and returns its ID (used by ProductFormPage to chain ingredient save).
  Future<String> createProductReturningId(Map<String, dynamic> data) async {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.creating());
    try {
      final newProduct = await _repository.createProduct(data);
      final updatedProducts = [...current.products, newProduct];
      state = AsyncData(ProductsState().loaded(updatedProducts));
      return newProduct.id;
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
      rethrow;
    }
  }

  Future<void> updateProduct(String id, Map<String, dynamic> data) async {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.updating());
    try {
      final updatedProduct = await _repository.updateProduct(id, data);
      final updatedProducts = current.products.map((p) {
        return p.id == id ? updatedProduct : p;
      }).toList();

      state = AsyncData(ProductsState().loaded(updatedProducts));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> deleteProduct(String id) async {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.deleting());
    try {
      await _repository.deleteProduct(id);
      final updatedProducts =
          current.products.where((p) => p.id != id).toList();
      state = AsyncData(ProductsState().loaded(updatedProducts));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> refresh() async {
    final current = state.valueOrNull ?? const ProductsState();
    await loadProducts(
      search: current.searchQuery,
      category: current.categoryFilter,
      status: current.statusFilter,
    );
  }

  void clearSelectedProduct() {
    final current = state.valueOrNull ?? const ProductsState();
    state = AsyncData(current.copyWith(selectedProduct: null));
  }

  Future<List<RecipeIngredient>> getIngredients(String productId) async {
    return _repository.getIngredients(productId);
  }

  Future<void> updateIngredients(
      String productId, List<Map<String, dynamic>> ingredients) async {
    await _repository.updateIngredients(productId, ingredients);
    // Reload product detail to reflect updated recipe
    await loadProductDetail(productId);
  }

  @override
  ProductsState build() {
    _repository = ref.watch(productsRepositoryProvider);
    loadProducts();
    return const ProductsState(isLoading: true);
  }
}
