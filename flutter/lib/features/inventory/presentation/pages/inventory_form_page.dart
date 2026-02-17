import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/features/inventory/presentation/providers/inventory_provider.dart';

class InventoryFormPage extends ConsumerStatefulWidget {
  final String? inventoryId;

  const InventoryFormPage({
    this.inventoryId,
    super.key,
  });

  @override
  ConsumerState<InventoryFormPage> createState() => _InventoryFormPageState();
}

class _InventoryFormPageState extends ConsumerState<InventoryFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _currentStockController = TextEditingController();
  final _minimumStockController = TextEditingController();
  final _unitController = TextEditingController();
  final _unitCostController = TextEditingController();
  String _type = 'ingredient';
  bool _isLoading = false;
  bool _isEdit = false;

  @override
  void initState() {
    super.initState();
    _isEdit = widget.inventoryId != null && widget.inventoryId!.isNotEmpty;
    if (_isEdit) {
      Future.microtask(_loadInventory);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _currentStockController.dispose();
    _minimumStockController.dispose();
    _unitController.dispose();
    _unitCostController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(title: _isEdit ? 'Editar item de inventario' : 'Nuevo item de inventario'),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Ingrediente o equipo'),
              validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _currentStockController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Stock actual'),
              validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _minimumStockController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Stock minimo'),
              validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _unitController,
              decoration: const InputDecoration(labelText: 'Unidad (kg, lt, pza)'),
              validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _unitCostController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Costo unitario'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _type,
              items: const [
                DropdownMenuItem(value: 'ingredient', child: Text('Ingrediente')),
                DropdownMenuItem(value: 'equipment', child: Text('Equipo')),
              ],
              onChanged: (value) => setState(() => _type = value ?? 'ingredient'),
              decoration: const InputDecoration(labelText: 'Tipo'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              child: Text(_isEdit ? 'Guardar cambios' : 'Guardar item'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadInventory() async {
    final id = widget.inventoryId;
    if (id == null || id.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      await ref.read(inventoryProvider.notifier).loadInventoryDetail(id);
      final state = ref.read(inventoryProvider).valueOrNull;
      final inventory = state?.selectedInventory;
      if (inventory != null) {
        _nameController.text = inventory.ingredientName;
        _currentStockController.text = inventory.currentStock.toString();
        _minimumStockController.text = inventory.minimumStock.toString();
        _unitController.text = inventory.unit;
        _unitCostController.text = inventory.unitCost?.toString() ?? '';
        _type = inventory.type;
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final currentStock = double.tryParse(_currentStockController.text.trim()) ?? 0;
    final minimumStock = double.tryParse(_minimumStockController.text.trim()) ?? 0;
    final unitCost = double.tryParse(_unitCostController.text.trim()) ?? 0;

    try {
      final payload = {
        'ingredient_name': _nameController.text.trim(),
        'current_stock': currentStock,
        'minimum_stock': minimumStock,
        'unit': _unitController.text.trim(),
        'unit_cost': unitCost,
        'type': _type,
      };

      if (_isEdit && widget.inventoryId != null) {
        await ref.read(inventoryProvider.notifier).updateInventory(widget.inventoryId!, payload);
      } else {
        await ref.read(inventoryProvider.notifier).createInventory(payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEdit ? 'Item actualizado' : 'Item creado')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
