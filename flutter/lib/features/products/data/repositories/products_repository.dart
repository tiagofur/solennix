import '../data_sources/products_remote_data_source.dart';
import '../models/product_model.dart';
import '../../domain/entities/product_entity.dart';

class ProductsRepository {
  final ProductsRemoteDataSource _remoteDataSource;

  ProductsRepository({
    required ProductsRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  Future<List<ProductEntity>> getProducts(
      {String? search, String? category, String? status}) async {
    try {
      final data = await _remoteDataSource.getProducts(
          search: search, category: category, status: status);
      final productsList = data['products'] as List<dynamic>;
      return productsList
          .map((json) =>
              ProductModel.fromJson(json as Map<String, dynamic>).toEntity())
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<ProductEntity> getProductById(String id) async {
    try {
      final data = await _remoteDataSource.getProductById(id);
      return ProductModel.fromJson(data).toEntity();
    } catch (e) {
      rethrow;
    }
  }

  Future<ProductEntity> createProduct(Map<String, dynamic> data) async {
    try {
      final createdData = await _remoteDataSource.createProduct(data);
      return ProductModel.fromJson(createdData).toEntity();
    } catch (e) {
      rethrow;
    }
  }

  Future<ProductEntity> updateProduct(
      String id, Map<String, dynamic> data) async {
    try {
      final updatedData = await _remoteDataSource.updateProduct(id, data);
      return ProductModel.fromJson(updatedData).toEntity();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      await _remoteDataSource.deleteProduct(id);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<RecipeIngredient>> getIngredients(String productId) async {
    try {
      final data = await _remoteDataSource.getIngredients(productId);
      return data
          .map((json) =>
              RecipeIngredientModel.fromJson(json as Map<String, dynamic>)
                  .toEntity())
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateIngredients(
      String productId, List<Map<String, dynamic>> ingredients) async {
    try {
      await _remoteDataSource.updateIngredients(productId, ingredients);
    } catch (e) {
      rethrow;
    }
  }
}
