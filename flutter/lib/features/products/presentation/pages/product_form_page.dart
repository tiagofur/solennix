import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/providers/products_provider.dart';
import 'package:eventosapp/features/inventory/presentation/providers/inventory_provider.dart';
import 'package:eventosapp/features/inventory/domain/entities/inventory_entity.dart';

enum _Step { basic, pricing, recipe, status, review }

// Mutable ingredient row used in the form (before saving)
class _IngredientRow {
  String? inventoryId;
  String ingredientName;
  String unit;
  double unitCost;
  double quantity;

  _IngredientRow({
    this.inventoryId,
    this.ingredientName = '',
    this.unit = '',
    this.unitCost = 0,
    this.quantity = 1,
  });

  double get totalCost => quantity * unitCost;
}

class ProductFormPage extends ConsumerStatefulWidget {
  final String? productId;

  const ProductFormPage({super.key, this.productId});

  @override
  ConsumerState<ProductFormPage> createState() => _ProductFormPageState();
}

class _ProductFormPageState extends ConsumerState<ProductFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _basePriceController = TextEditingController();
  bool _isActive = true;

  _Step _currentStep = _Step.basic;
  bool _isLoading = false;
  bool _isLoadingIngredients = false;
  String _selectedCategory = 'Boda';

  final List<String> _categories = ['Boda', 'XV', 'Cumpleanos', 'Corporate'];
  final List<_IngredientRow> _ingredients = [];

  @override
  void initState() {
    super.initState();
    // Load inventory list for the ingredient selector
    Future.microtask(() {
      ref.read(inventoryProvider.notifier).loadInventories();
      if (widget.productId != null) {
        _loadExistingData();
      }
    });
  }

  Future<void> _loadExistingData() async {
    setState(() => _isLoadingIngredients = true);
    try {
      // Load product detail (name, price, etc.)
      await ref
          .read(productsProvider.notifier)
          .loadProductDetail(widget.productId!);
      final product = ref.read(productsProvider).valueOrNull?.selectedProduct;
      if (product != null && mounted) {
        _nameController.text = product.name;
        _descriptionController.text = product.description ?? '';
        _basePriceController.text = product.basePrice.toString();
        setState(() {
          _selectedCategory = product.category;
          _isActive = product.isActive;
        });
      }
      // Load existing recipe ingredients
      final existing = await ref
          .read(productsProvider.notifier)
          .getIngredients(widget.productId!);
      if (mounted) {
        setState(() {
          _ingredients.clear();
          for (final ing in existing) {
            _ingredients.add(_IngredientRow(
              inventoryId: ing.inventoryId,
              ingredientName: ing.ingredientName,
              unit: ing.unit,
              unitCost: ing.unitCost,
              quantity: ing.quantityRequired,
            ));
          }
        });
      }
    } catch (_) {
      // Silently ignore — form still usable
    } finally {
      if (mounted) setState(() => _isLoadingIngredients = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _basePriceController.dispose();
    super.dispose();
  }

  double get _recipeCost =>
      _ingredients.fold(0.0, (sum, ing) => sum + ing.totalCost);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
            widget.productId != null ? 'Editar Producto' : 'Nuevo Producto'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: Stepper(
                currentStep: _currentStep.index,
                onStepContinue: _handleStepContinue,
                onStepCancel: () => context.pop(),
                controlsBuilder: (context, details) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Row(
                      children: [
                        if (_currentStep != _Step.review)
                          ElevatedButton(
                            onPressed: details.onStepContinue,
                            child: const Text('Siguiente'),
                          )
                        else
                          ElevatedButton(
                            onPressed: _handleSubmit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(context).primaryColor,
                            ),
                            child: const Text('Guardar'),
                          ),
                        const SizedBox(width: 12),
                        TextButton(
                          onPressed: details.onStepCancel,
                          child: const Text('Cancelar'),
                        ),
                        if (_currentStep != _Step.basic) ...[
                          const SizedBox(width: 12),
                          TextButton(
                            onPressed: () => setState(() {
                              _currentStep =
                                  _Step.values[_currentStep.index - 1];
                            }),
                            child: const Text('Atrás'),
                          ),
                        ],
                      ],
                    ),
                  );
                },
                steps: [
                  Step(
                    title: const Text('Información Básica'),
                    content: _buildBasicStep(),
                    isActive: _currentStep == _Step.basic,
                  ),
                  Step(
                    title: const Text('Precio'),
                    content: _buildPricingStep(),
                    isActive: _currentStep == _Step.pricing,
                  ),
                  Step(
                    title: const Text('Receta'),
                    content: _buildRecipeStep(),
                    isActive: _currentStep == _Step.recipe,
                  ),
                  Step(
                    title: const Text('Estado'),
                    content: _buildStatusStep(),
                    isActive: _currentStep == _Step.status,
                  ),
                  Step(
                    title: const Text('Revisar'),
                    content: _buildReviewStep(),
                    isActive: _currentStep == _Step.review,
                  ),
                ],
              ),
            ),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Steps
  // ──────────────────────────────────────────────────────────────────────────

  Widget _buildBasicStep() {
    return Column(
      children: [
        TextFormField(
          controller: _nameController,
          decoration: const InputDecoration(
            labelText: 'Nombre del producto',
            prefixIcon: Icon(Icons.inventory_2),
            border: OutlineInputBorder(),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return 'El nombre es requerido';
            return null;
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _descriptionController,
          decoration: const InputDecoration(
            labelText: 'Descripción',
            prefixIcon: Icon(Icons.description),
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: _selectedCategory,
          decoration: const InputDecoration(
            labelText: 'Categoría',
            prefixIcon: Icon(Icons.category),
            border: OutlineInputBorder(),
          ),
          items: _categories.map((c) {
            return DropdownMenuItem(value: c, child: Text(c));
          }).toList(),
          onChanged: (value) {
            if (value != null) setState(() => _selectedCategory = value);
          },
        ),
      ],
    );
  }

  Widget _buildPricingStep() {
    return Column(
      children: [
        TextFormField(
          controller: _basePriceController,
          decoration: const InputDecoration(
            labelText: 'Precio base',
            prefixIcon: Icon(Icons.attach_money),
            border: OutlineInputBorder(),
            prefixText: '\$',
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          validator: (value) {
            if (value == null || value.isEmpty) return 'El precio es requerido';
            if (double.tryParse(value) == null) return 'Precio inválido';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildRecipeStep() {
    if (_isLoadingIngredients) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(),
        ),
      );
    }

    final inventoryState = ref.watch(inventoryProvider);
    final allIngredients = inventoryState.valueOrNull?.inventories
            .where((i) => i.type == 'ingredient')
            .toList() ??
        [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Define qué ingredientes y qué cantidad se necesitan para 1 unidad de este producto.',
          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
        ),
        const SizedBox(height: 16),
        if (_ingredients.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'Sin ingredientes — este producto no tiene receta.',
                style: TextStyle(color: Colors.grey[500], fontSize: 13),
              ),
            ),
          )
        else
          ..._ingredients.asMap().entries.map((entry) {
            return _buildIngredientRow(entry.key, entry.value, allIngredients);
          }),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () {
            setState(() {
              _ingredients.add(_IngredientRow());
            });
          },
          icon: const Icon(Icons.add),
          label: const Text('Agregar ingrediente'),
        ),
        if (_ingredients.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Costo total de receta',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  '\$${_recipeCost.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Color(0xFFFF6B35),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildIngredientRow(
    int index,
    _IngredientRow row,
    List<InventoryItemEntity> allIngredients,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: row.inventoryId,
                    decoration: const InputDecoration(
                      labelText: 'Ingrediente',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: null,
                        child: Text('Seleccionar...'),
                      ),
                      ...allIngredients.map((inv) => DropdownMenuItem(
                            value: inv.id,
                            child: Text(
                              '${inv.ingredientName} (${inv.unit})',
                              overflow: TextOverflow.ellipsis,
                            ),
                          )),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      final inv =
                          allIngredients.firstWhere((i) => i.id == value);
                      setState(() {
                        row.inventoryId = value;
                        row.ingredientName = inv.ingredientName;
                        row.unit = inv.unit;
                        row.unitCost = inv.unitCost;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () => setState(() => _ingredients.removeAt(index)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: row.quantity == 1 && row.inventoryId == null
                        ? ''
                        : row.quantity.toString(),
                    decoration: InputDecoration(
                      labelText: 'Cantidad',
                      suffixText: row.unit.isNotEmpty ? row.unit : null,
                      border: const OutlineInputBorder(),
                      isDense: true,
                    ),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (v) {
                      final parsed = double.tryParse(v);
                      if (parsed != null) {
                        setState(() => row.quantity = parsed);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Costo unitario',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                    Text(
                      '\$${row.unitCost.toStringAsFixed(2)}/${row.unit.isNotEmpty ? row.unit : '?'}',
                      style: const TextStyle(fontSize: 13),
                    ),
                    Text(
                      '= \$${row.totalCost.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFF6B35),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusStep() {
    return Column(
      children: [
        SwitchListTile(
          title: const Text('Producto activo'),
          subtitle:
              const Text('Controla si el producto aparece en cotizaciones.'),
          value: _isActive,
          onChanged: (value) => setState(() => _isActive = value),
        ),
      ],
    );
  }

  Widget _buildReviewStep() {
    final basePrice = double.tryParse(_basePriceController.text) ?? 0;
    final margin = basePrice - _recipeCost;
    final marginPct = basePrice > 0 ? (margin / basePrice) * 100 : 0;
    final marginColor = marginPct >= 30
        ? Colors.green
        : marginPct >= 10
            ? Colors.orange
            : Colors.red;

    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Resumen del Producto',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                _buildReviewField('Nombre', _nameController.text),
                _buildReviewField('Descripción', _descriptionController.text),
                _buildReviewField('Categoría', _selectedCategory),
                _buildReviewField(
                    'Precio base', '\$${_basePriceController.text}'),
                _buildReviewField('Estado', _isActive ? 'Activo' : 'Inactivo'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Receta (${_ingredients.length} ingrediente${_ingredients.length == 1 ? '' : 's'})',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                if (_ingredients.isEmpty)
                  Text('Sin receta', style: TextStyle(color: Colors.grey[500]))
                else
                  ..._ingredients.map((ing) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            const Icon(Icons.circle,
                                size: 6, color: Color(0xFFFF6B35)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${ing.ingredientName.isNotEmpty ? ing.ingredientName : 'Sin seleccionar'} × ${ing.quantity}${ing.unit.isNotEmpty ? ' ${ing.unit}' : ''}',
                              ),
                            ),
                            Text(
                              '\$${ing.totalCost.toStringAsFixed(2)}',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      )),
                if (_ingredients.isNotEmpty) ...[
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Costo receta',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      Text('\$${_recipeCost.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Margen bruto'),
                      Text(
                        '\$${margin.toStringAsFixed(2)} (${marginPct.toStringAsFixed(1)}%)',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, color: marginColor),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReviewField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text('$label:',
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          Expanded(child: Text(value.isNotEmpty ? value : 'No especificado')),
        ],
      ),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation & Submit
  // ──────────────────────────────────────────────────────────────────────────

  void _handleStepContinue() {
    switch (_currentStep) {
      case _Step.basic:
        if (_formKey.currentState!.validate()) {
          setState(() => _currentStep = _Step.pricing);
        }
      case _Step.pricing:
        if (_formKey.currentState!.validate()) {
          setState(() => _currentStep = _Step.recipe);
        }
      case _Step.recipe:
        setState(() => _currentStep = _Step.status);
      case _Step.status:
        setState(() => _currentStep = _Step.review);
      case _Step.review:
        _handleSubmit();
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    // Validate that all selected ingredient rows have an inventory item chosen
    final incomplete = _ingredients.any((i) => i.inventoryId == null);
    if (incomplete) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Selecciona un ingrediente en todas las filas de receta o elimina las vacías.'),
          backgroundColor: Colors.orange,
        ),
      );
      setState(() => _currentStep = _Step.recipe);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final productData = {
        'name': _nameController.text.trim(),
        'description': _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        'category': _selectedCategory,
        'base_price': double.parse(_basePriceController.text),
        'is_active': _isActive,
      };

      String productId;
      if (widget.productId != null) {
        await ref
            .read(productsProvider.notifier)
            .updateProduct(widget.productId!, productData);
        productId = widget.productId!;
      } else {
        final newProduct = await ref
            .read(productsProvider.notifier)
            .createProductReturningId(productData);
        productId = newProduct;
      }

      // Save recipe ingredients
      final ingredientsPayload = _ingredients
          .map((i) => {
                'inventory_id': i.inventoryId!,
                'quantity_required': i.quantity,
              })
          .toList();

      await ref
          .read(productsProvider.notifier)
          .updateIngredients(productId, ingredientsPayload);

      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.productId != null
                ? 'Producto actualizado correctamente'
                : 'Producto creado correctamente'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
