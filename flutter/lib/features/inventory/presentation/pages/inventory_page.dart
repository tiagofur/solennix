import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/providers/inventory_provider.dart';
import '../../presentation/providers/inventory_state.dart';
import '../../domain/entities/inventory_entity.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/shared/widgets/loading_widget.dart';
import 'package:eventosapp/shared/widgets/error_widget.dart' as app_widgets;
import 'package:eventosapp/shared/widgets/status_badge.dart';

class InventoryPage extends ConsumerStatefulWidget {
  const InventoryPage({super.key});

  @override
  ConsumerState<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends ConsumerState<InventoryPage> {
  @override
  Widget build(BuildContext context) {
    final inventoryAsync = ref.watch(inventoryProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Inventario',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(inventoryProvider.notifier).refresh(),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/inventory/new'),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          _buildFilters(context),
          Expanded(
            child: inventoryAsync.when(
              loading: () => const LoadingWidget(message: 'Cargando inventario...'),
              error: (error, stack) => app_widgets.ErrorWidget(
                message: error.toString(),
                onRetry: () => ref.read(inventoryProvider.notifier).refresh(),
              ),
              data: (state) => _buildInventoryList(context, state),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters(BuildContext context) {
    final currentState = ref.watch(inventoryProvider).valueOrNull ?? const InventoryState();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Todos'),
                  selected: currentState.typeFilter == null,
                  onSelected: (selected) {
                    if (selected) {
                      ref.read(inventoryProvider.notifier).filterByType(null);
                    }
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Ingredientes'),
                  selected: currentState.typeFilter == 'ingredient',
                  onSelected: (selected) {
                    ref.read(inventoryProvider.notifier).filterByType(selected ? 'ingredient' : null);
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Equipo'),
                  selected: currentState.typeFilter == 'equipment',
                  onSelected: (selected) {
                    ref.read(inventoryProvider.notifier).filterByType(selected ? 'equipment' : null);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Solo stock bajo'),
            value: currentState.lowStockOnly,
            onChanged: (value) => ref.read(inventoryProvider.notifier).toggleLowStockOnly(value),
          ),
        ],
      ),
    );
  }

  Widget _buildInventoryList(BuildContext context, InventoryState state) {
    if (state.inventories.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No hay items de inventario registrados',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(inventoryProvider.notifier).refresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.inventories.length,
        itemBuilder: (context, index) {
          final inventory = state.inventories[index];
          return _buildInventoryCard(context, inventory);
        },
      ),
    );
  }

  Widget _buildInventoryCard(BuildContext context, InventoryItemEntity inventory) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => context.push('/inventory/${inventory.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: _getTypeColor(inventory.type).withOpacity(0.1),
                    child: Icon(_getTypeIcon(inventory.type), color: _getTypeColor(inventory.type)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          inventory.ingredientName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getTypeLabel(inventory.type),
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (inventory.isLowStock)
                    StatusBadge(
                      label: 'Stock bajo',
                      color: Colors.orange,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildInfoItem(Icons.inventory_2, inventory.formattedCurrentStock, Colors.blue),
                  _buildInfoItem(Icons.warning, inventory.formattedMinimumStock, Colors.orange),
                  _buildInfoItem(Icons.attach_money, inventory.formattedUnitCost, Colors.green),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, Color color) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey[700]),
        ),
      ],
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'equipment':
        return Colors.indigo;
      case 'ingredient':
      default:
        return Colors.teal;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'equipment':
        return Icons.handyman;
      case 'ingredient':
      default:
        return Icons.restaurant;
    }
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'equipment':
        return 'Equipo';
      case 'ingredient':
        return 'Ingrediente';
      default:
        return type;
    }
  }
}
