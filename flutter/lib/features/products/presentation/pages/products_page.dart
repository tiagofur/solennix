import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/providers/products_provider.dart';
import '../../presentation/providers/products_state.dart';
import '../../domain/entities/product_entity.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/shared/widgets/loading_widget.dart';
import 'package:eventosapp/shared/widgets/error_widget.dart' as app_widgets;
import 'package:eventosapp/shared/widgets/status_badge.dart';

class ProductsPage extends ConsumerStatefulWidget {
  const ProductsPage({super.key});

  @override
  ConsumerState<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends ConsumerState<ProductsPage> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(productsProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Productos',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              context.push('/products/new');
            },
            tooltip: 'Agregar producto',
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(context),
          _buildCategoryFilter(context),
          Expanded(
            child: productsAsync.when(
              loading: () =>
                  const LoadingWidget(message: 'Cargando productos...'),
              error: (error, stack) => app_widgets.ErrorWidget(
                message: error.toString(),
                onRetry: () => ref.read(productsProvider.notifier).refresh(),
              ),
              data: (state) => _buildProductsList(context, state),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    final currentState = ref.watch(productsProvider).valueOrNull;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Buscar productos...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    ref.read(productsProvider.notifier).searchProducts('');
                  },
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          filled: true,
          fillColor: Colors.grey[50],
        ),
        onChanged: (value) {
          ref.read(productsProvider.notifier).searchProducts(value);
        },
      ),
    );
  }

  Widget _buildCategoryFilter(BuildContext context) {
    final currentState = ref.watch(productsProvider).valueOrNull;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            FilterChip(
              label: const Text('Todas'),
              selected: currentState?.categoryFilter == null,
              onSelected: (selected) {
                if (selected) {
                  ref.read(productsProvider.notifier).filterByCategory(null);
                }
              },
            ),
            const SizedBox(width: 8),
            ...currentState?.categories.map((category) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(category),
                      selected: currentState?.categoryFilter == category,
                      onSelected: (selected) {
                        if (selected) {
                          ref
                              .read(productsProvider.notifier)
                              .filterByCategory(category);
                        } else {
                          ref
                              .read(productsProvider.notifier)
                              .filterByCategory(null);
                        }
                      },
                    ),
                  );
                }).toList() ??
                [],
            const SizedBox(width: 8),
            FilterChip(
              label: const Text('Activos'),
              selected: currentState?.statusFilter == 'active',
              onSelected: (selected) {
                if (selected) {
                  ref.read(productsProvider.notifier).filterByStatus('active');
                } else {
                  ref.read(productsProvider.notifier).filterByStatus(null);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductsList(BuildContext context, ProductsState state) {
    if (state.products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              state.searchQuery.isNotEmpty || state.categoryFilter != null
                  ? 'No se encontraron productos'
                  : 'No tienes productos registrados',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            if (state.searchQuery.isEmpty && state.categoryFilter == null)
              ElevatedButton.icon(
                onPressed: () => context.push('/products/new'),
                icon: const Icon(Icons.add),
                label: const Text('Agregar producto'),
              ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(productsProvider.notifier).refresh(),
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 0.7,
        ),
        itemCount: state.products.length,
        itemBuilder: (context, index) {
          final product = state.products[index];
          return _buildProductCard(context, product);
        },
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, ProductEntity product) {
    return Card(
      elevation: product.isActive ? 2 : 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () => context.push('/products/${product.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      product.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _showDeleteProductDialog(context, product),
                    child: const Icon(Icons.delete_outline,
                        size: 20, color: Colors.red),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                product.description ?? 'Sin descripción',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const Spacer(),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    product.formattedPrice,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
                  StatusBadge(
                    label: product.statusLabel,
                    color: product.statusColor,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                product.isActive ? 'Activo' : 'Inactivo',
                style: TextStyle(
                  fontSize: 12,
                  color: product.isActive ? Colors.green : Colors.grey[700],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.category_outlined,
                      size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    product.category,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDeleteProductDialog(BuildContext context, ProductEntity product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar producto'),
        content: Text(
            '¿Eliminar "${product.name}"? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(productsProvider.notifier).deleteProduct(product.id);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }
}
