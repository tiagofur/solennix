import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/providers/inventory_provider.dart';
import '../../domain/entities/inventory_entity.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/shared/widgets/loading_widget.dart';
import 'package:eventosapp/shared/widgets/error_widget.dart' as app_widgets;
import 'package:eventosapp/shared/widgets/status_badge.dart';

class InventoryDetailPage extends ConsumerStatefulWidget {
  final String inventoryId;

  const InventoryDetailPage({super.key, required this.inventoryId});

  @override
  ConsumerState<InventoryDetailPage> createState() => _InventoryDetailPageState();
}

class _InventoryDetailPageState extends ConsumerState<InventoryDetailPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(inventoryProvider.notifier).loadInventoryDetail(widget.inventoryId));
  }

  @override
  Widget build(BuildContext context) {
    final inventoryAsync = ref.watch(inventoryProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Detalle de Inventario',
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => context.push('/inventory/edit/${widget.inventoryId}'),
            tooltip: 'Editar',
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => _confirmDelete(context),
            tooltip: 'Eliminar',
          ),
        ],
      ),
      body: inventoryAsync.when(
        loading: () => const LoadingWidget(message: 'Cargando inventario...'),
        error: (error, stack) => app_widgets.ErrorWidget(
          message: error.toString(),
          onRetry: () => ref.read(inventoryProvider.notifier).loadInventoryDetail(widget.inventoryId),
        ),
        data: (state) {
          final inventory = state.selectedInventory;
          if (inventory == null) {
            return const Center(child: Text('Inventario no encontrado'));
          }
          return _buildInventoryContent(context, inventory);
        },
      ),
    );
  }

  Widget _buildInventoryContent(BuildContext context, InventoryItemEntity inventory) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(context, inventory),
          const SizedBox(height: 20),
          _buildSectionTitle('Resumen'),
          const SizedBox(height: 12),
          _buildInfoRow(Icons.inventory_2, 'Stock actual', inventory.formattedCurrentStock),
          _buildInfoRow(Icons.warning, 'Stock minimo', inventory.formattedMinimumStock),
          _buildInfoRow(Icons.attach_money, 'Costo unitario', inventory.formattedUnitCost),
          _buildInfoRow(Icons.update, 'Actualizado', inventory.formattedLastUpdated),
          const SizedBox(height: 20),
          _buildSectionTitle('Estado'),
          const SizedBox(height: 12),
          Row(
            children: [
              StatusBadge(
                label: inventory.isLowStock ? 'Stock bajo' : 'Stock normal',
                color: inventory.isLowStock ? Colors.orange : Colors.green,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, InventoryItemEntity inventory) {
    final typeColor = _getTypeColor(inventory.type);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            typeColor,
            typeColor.withOpacity(0.7),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: Colors.white,
            child: Icon(_getTypeIcon(inventory.type), color: typeColor, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  inventory.ingredientName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _getTypeLabel(inventory.type),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                Text(
                  value,
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
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

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar item'),
        content: const Text('Esta accion no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(inventoryProvider.notifier).deleteInventory(widget.inventoryId);
              if (mounted) {
                context.pop();
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }
}
