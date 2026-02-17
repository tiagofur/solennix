import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/shared/widgets/loading_widget.dart';
import 'package:eventosapp/shared/widgets/error_widget.dart' as app_widgets;
import 'package:eventosapp/shared/widgets/status_badge.dart';
import 'package:eventosapp/core/utils/date_formatter.dart';
import 'package:eventosapp/core/utils/formatters.dart';
import 'package:eventosapp/features/events/presentation/providers/events_provider.dart';
import 'package:eventosapp/features/events/presentation/providers/events_state.dart';
import 'package:eventosapp/features/events/domain/entities/event_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_product_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_extra_entity.dart';
import 'package:eventosapp/features/clients/presentation/providers/clients_provider.dart';
import 'package:eventosapp/features/clients/presentation/providers/clients_state.dart';
import 'package:eventosapp/features/clients/domain/entities/client_entity.dart';
import 'package:eventosapp/features/products/presentation/providers/products_provider.dart';
import 'package:eventosapp/features/products/domain/entities/product_entity.dart';

class EventsPage extends ConsumerStatefulWidget {
  const EventsPage({super.key});

  @override
  ConsumerState<EventsPage> createState() => _EventsPageState();
}

class _EventsPageState extends ConsumerState<EventsPage> {
  final TextEditingController _searchController = TextEditingController();
  String? _selectedStatus;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(eventsProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Eventos',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/events/new'),
            tooltip: 'Crear evento',
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildFilterChips(),
          Expanded(
            child: eventsAsync.when(
              loading: () => const LoadingWidget(message: 'Cargando eventos...'),
              error: (error, stack) => app_widgets.ErrorWidget(
                message: error.toString(),
                onRetry: () => ref.read(eventsProvider.notifier).refresh(),
              ),
              data: (state) => _buildEventsList(state),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Buscar por cliente o evento',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          filled: true,
          fillColor: Colors.grey[50],
        ),
        onChanged: (value) => setState(() {}),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildStatusChip('Todos', null),
            const SizedBox(width: 8),
            _buildStatusChip('Cotizado', 'quoted'),
            const SizedBox(width: 8),
            _buildStatusChip('Confirmado', 'confirmed'),
            const SizedBox(width: 8),
            _buildStatusChip('Completado', 'completed'),
            const SizedBox(width: 8),
            _buildStatusChip('Cancelado', 'cancelled'),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String label, String? status) {
    final selected = _selectedStatus == status;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (isSelected) {
        setState(() {
          _selectedStatus = isSelected ? status : null;
        });
        if (isSelected && status != null) {
          ref.read(eventsProvider.notifier).filterByStatus(status);
        } else {
          ref.read(eventsProvider.notifier).loadEvents();
        }
      },
    );
  }

  Widget _buildEventsList(EventsState state) {
    final query = _searchController.text.trim().toLowerCase();
    final filtered = state.events.where((event) {
      if (query.isEmpty) return true;
      return event.clientName.toLowerCase().contains(query) ||
          event.serviceType.toLowerCase().contains(query);
    }).toList();

    if (filtered.isEmpty) {
      return const Center(child: Text('No hay eventos disponibles'));
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(eventsProvider.notifier).refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: filtered.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final event = filtered[index];
          return _EventCard(event: event);
        },
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final EventEntity event;

  const _EventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/events/${event.id}'),
      borderRadius: BorderRadius.circular(16),
      child: Card(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      event.serviceType,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  StatusBadge(
                    label: _statusLabel(event.status),
                    color: _statusColor(event.status),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                event.clientName,
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(DateFormatter.format(event.eventDate)),
                  const SizedBox(width: 12),
                  const Icon(Icons.schedule, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text('${event.startTime} - ${event.endTime}'),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Expanded(child: Text(event.location)),
                  const SizedBox(width: 8),
                  Text(
                    CurrencyFormatter.format(event.totalAmount),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _statusLabel(String status) {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'quoted':
        return 'Cotizado';
      default:
        return 'Cotizado';
    }
  }

  static Color _statusColor(String status) {
    switch (status) {
      case 'confirmed':
        return Colors.blue;
      case 'completed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'quoted':
        return Colors.orange;
      default:
        return Colors.orange;
    }
  }
}

class EventDetailPage extends ConsumerStatefulWidget {
  final String eventId;
  const EventDetailPage({super.key, required this.eventId});

  @override
  ConsumerState<EventDetailPage> createState() => _EventDetailPageState();
}

class _EventDetailPageState extends ConsumerState<EventDetailPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(eventDetailProvider.notifier).loadEventDetail(widget.eventId));
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(eventDetailProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Detalle del Evento',
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => context.push('/events/edit/${widget.eventId}'),
            tooltip: 'Editar',
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const LoadingWidget(message: 'Cargando evento...'),
        error: (error, stack) => app_widgets.ErrorWidget(
          message: error.toString(),
          onRetry: () => ref.read(eventDetailProvider.notifier).loadEventDetail(widget.eventId),
        ),
        data: (state) {
          final event = state.event;
          if (event == null) {
            return const Center(child: Text('Evento no encontrado'));
          }
          return DefaultTabController(
            length: 4,
            child: Column(
              children: [
                const TabBar(
                  tabs: [
                    Tab(text: 'Resumen'),
                    Tab(text: 'Pagos'),
                    Tab(text: 'Ingredientes'),
                    Tab(text: 'Contrato'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      _buildSummaryTab(event, state),
                      _buildPaymentsTab(event),
                      _buildIngredientsTab(state),
                      _buildContractTab(event, state),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(EventEntity event) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    event.serviceType,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: event.status,
                    items: const [
                      DropdownMenuItem(value: 'quoted', child: Text('Cotizado')),
                      DropdownMenuItem(value: 'confirmed', child: Text('Confirmado')),
                      DropdownMenuItem(value: 'completed', child: Text('Completado')),
                      DropdownMenuItem(value: 'cancelled', child: Text('Cancelado')),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      ref.read(eventDetailProvider.notifier).updateEvent(
                        event.id,
                        {'status': value},
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(event.clientName, style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                const SizedBox(width: 6),
                Text(DateFormatter.format(event.eventDate)),
                const SizedBox(width: 12),
                const Icon(Icons.schedule, size: 16, color: Colors.grey),
                const SizedBox(width: 6),
                Text('${event.startTime} - ${event.endTime}'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                const SizedBox(width: 6),
                Expanded(child: Text(event.location)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryTab(EventEntity event, EventDetailState state) {
    return RefreshIndicator(
      onRefresh: () => ref.read(eventDetailProvider.notifier).loadEventDetail(widget.eventId),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildHeader(event),
          const SizedBox(height: 16),
          _buildInfoCard(event),
          const SizedBox(height: 16),
          _buildProductsSection(state.products),
          const SizedBox(height: 16),
          _buildExtrasSection(state.extras),
          const SizedBox(height: 16),
          _buildFinancialSummary(event, state),
        ],
      ),
    );
  }

  Widget _buildInfoCard(EventEntity event) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _InfoRow(label: 'Total', value: CurrencyFormatter.format(event.totalAmount)),
            const SizedBox(height: 8),
            _InfoRow(label: 'Depósito', value: CurrencyFormatter.format(event.depositAmount)),
            const SizedBox(height: 8),
            _InfoRow(label: 'Saldo pendiente', value: CurrencyFormatter.format(event.pendingAmount)),
            const SizedBox(height: 8),
            _InfoRow(label: 'Notas', value: event.notes ?? 'Sin notas'),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentsSection(EventEntity event) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Pagos',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _showAddPaymentDialog(event.id),
                  icon: const Icon(Icons.add),
                  label: const Text('Agregar'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (event.payments.isEmpty)
              const Text('Sin pagos registrados')
            else
              ...event.payments.map((payment) {
                final paymentLabel = payment.method?.isNotEmpty == true
                    ? payment.method!
                    : 'Metodo no especificado';
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(CurrencyFormatter.format(payment.amount)),
                  subtitle: Text('${DateFormatter.format(payment.paymentDate)} · $paymentLabel'),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentsTab(EventEntity event) {
    return RefreshIndicator(
      onRefresh: () => ref.read(eventDetailProvider.notifier).loadEventDetail(widget.eventId),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [_buildPaymentsSection(event)],
      ),
    );
  }

  Widget _buildIngredientsTab(EventDetailState state) {
    if (state.ingredients.isEmpty) {
      return const Center(child: Text('No hay ingredientes calculados'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemBuilder: (context, index) {
        final item = state.ingredients[index];
        return ListTile(
          title: Text(item.name),
          subtitle: Text('${item.quantity.toStringAsFixed(2)} ${item.unit}'),
          trailing: Text(CurrencyFormatter.format(item.cost)),
        );
      },
      separatorBuilder: (_, __) => const Divider(),
      itemCount: state.ingredients.length,
    );
  }

  Widget _buildContractTab(EventEntity event, EventDetailState state) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Contrato de Servicios',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Text('Cliente: ${event.clientName}'),
        Text('Fecha: ${DateFormatter.format(event.eventDate)}'),
        Text('Lugar: ${event.location}'),
        const SizedBox(height: 12),
        Text('Deposito: ${event.depositPercent}%'),
        Text('Cancelacion: ${event.cancellationDays} dias'),
        Text('Reembolso: ${event.refundPercent}%'),
        const SizedBox(height: 16),
        Text('Productos:', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ...state.products.map((p) => Text('${p.quantity}x ${p.productName}')),
        const SizedBox(height: 12),
        Text('Extras:', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (state.extras.isEmpty)
          const Text('Sin extras')
        else
          ...state.extras.map((e) => Text(e.description)),
      ],
    );
  }

  Widget _buildProductsSection(List<EventProductEntity> products) {
    if (products.isEmpty) {
      return const Text('Sin productos');
    }
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Productos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...products.map((p) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(p.productName)),
                    Text('${p.quantity} x ${CurrencyFormatter.format(p.unitPrice)}'),
                  ],
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildExtrasSection(List<EventExtraEntity> extras) {
    if (extras.isEmpty) {
      return const Text('Sin extras');
    }
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Extras', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...extras.map((e) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(e.description)),
                    Text(CurrencyFormatter.format(e.price)),
                  ],
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialSummary(EventEntity event, EventDetailState state) {
    final productsTotal = state.products.fold(0.0, (sum, item) => sum + item.lineTotal);
    final extrasTotal = state.extras.fold(0.0, (sum, item) => sum + item.price);
    final subtotal = productsTotal + extrasTotal;
    final discountAmount = subtotal * (event.discount / 100);
    final discounted = subtotal - discountAmount;
    final taxAmount = event.requiresInvoice ? discounted * (event.taxRate / 100) : 0.0;
    final total = discounted + taxAmount;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Resumen financiero', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            _InfoRow(label: 'Subtotal', value: CurrencyFormatter.format(subtotal)),
            const SizedBox(height: 8),
            _InfoRow(label: 'Descuento', value: CurrencyFormatter.format(discountAmount)),
            const SizedBox(height: 8),
            _InfoRow(label: 'IVA', value: CurrencyFormatter.format(taxAmount)),
            const SizedBox(height: 8),
            _InfoRow(label: 'Total', value: CurrencyFormatter.format(total)),
          ],
        ),
      ),
    );
  }

  Future<void> _showAddPaymentDialog(String eventId) async {
    final amountController = TextEditingController();
    final methodController = TextEditingController();
    final notesController = TextEditingController();
    final dateController = TextEditingController(text: DateFormatter.format(DateTime.now(), pattern: 'dd/MM/yyyy'));

    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Agregar pago'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Monto'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: dateController,
                readOnly: true,
                decoration: const InputDecoration(labelText: 'Fecha de pago'),
                onTap: () async {
                  final selected = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100),
                  );
                  if (selected != null) {
                    dateController.text = DateFormatter.format(selected, pattern: 'dd/MM/yyyy');
                  }
                },
              ),
              const SizedBox(height: 8),
              TextField(
                controller: methodController,
                decoration: const InputDecoration(labelText: 'Método'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: notesController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Notas (opcional)'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                amountController.dispose();
                methodController.dispose();
                notesController.dispose();
                dateController.dispose();
                Navigator.of(context).pop();
              },
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () async {
                final amount = double.tryParse(amountController.text.trim()) ?? 0;
                final selectedDate = _normalizeDate(dateController.text);
                await ref.read(eventDetailProvider.notifier).addPayment(eventId, {
                  'event_id': eventId,
                  'amount': amount,
                  'payment_date': selectedDate,
                  'payment_method': methodController.text.trim().isEmpty ? null : methodController.text.trim(),
                  'notes': notesController.text.trim().isEmpty ? null : notesController.text.trim(),
                });
                amountController.dispose();
                methodController.dispose();
                notesController.dispose();
                dateController.dispose();
                if (context.mounted) Navigator.of(context).pop();
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
  }

  String _normalizeDate(String formatted) {
    final parts = formatted.split('/');
    if (parts.length == 3) {
      final day = parts[0].padLeft(2, '0');
      final month = parts[1].padLeft(2, '0');
      final year = parts[2];
      return '$year-$month-$day';
    }
    return DateTime.now().toIso8601String().split('T').first;
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(label, style: TextStyle(color: Colors.grey[600]))),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class EventFormPage extends ConsumerStatefulWidget {
  final String? eventId;

  const EventFormPage({
    this.eventId,
    super.key,
  });

  @override
  ConsumerState<EventFormPage> createState() => _EventFormPageState();
}

class _EventFormPageState extends ConsumerState<EventFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _serviceTypeController = TextEditingController();
  final _locationController = TextEditingController();
  final _notesController = TextEditingController();
  final _depositPercentController = TextEditingController();
  final _numPeopleController = TextEditingController();
  final _cityController = TextEditingController();
  final _taxRateController = TextEditingController(text: '16');
  final _discountController = TextEditingController(text: '0');
  final _refundController = TextEditingController(text: '0');
  final _cancellationDaysController = TextEditingController(text: '15');
  DateTime _eventDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 12, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 18, minute: 0);
  String _status = 'quoted';
  String? _selectedClientId;
  String? _selectedClientName;
  bool _clientsLoaded = false;
  bool _requiresInvoice = false;
  bool _hasLoadedDetails = false;
  int _currentStep = 0;
  bool _isSubmitting = false;
  bool _isEdit = false;

  final List<Map<String, dynamic>> _selectedProducts = [];
  final List<Map<String, dynamic>> _extras = [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_clientsLoaded) {
      _clientsLoaded = true;
      ref.read(clientsProvider.notifier).loadClients();
    }
  }

  @override
  void initState() {
    super.initState();
    _isEdit = widget.eventId != null && widget.eventId!.isNotEmpty;
    if (_isEdit) {
      Future.microtask(_loadEvent);
    }
  }

  @override
  void dispose() {
    _serviceTypeController.dispose();
    _locationController.dispose();
    _notesController.dispose();
    _depositPercentController.dispose();
    _numPeopleController.dispose();
    _cityController.dispose();
    _taxRateController.dispose();
    _discountController.dispose();
    _refundController.dispose();
    _cancellationDaysController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final clientsAsync = ref.watch(clientsProvider);

    return Scaffold(
      appBar: CustomAppBar(title: _isEdit ? 'Editar Evento' : 'Nuevo Evento'),
      body: Form(
        key: _formKey,
        child: Stepper(
          currentStep: _currentStep,
          onStepContinue: _handleStepContinue,
          onStepCancel: _handleStepCancel,
          controlsBuilder: (context, details) {
            return Row(
              children: [
                ElevatedButton(
                  onPressed: _isSubmitting ? null : details.onStepContinue,
                  child: Text(_currentStep == 3 ? 'Guardar' : 'Siguiente'),
                ),
                const SizedBox(width: 12),
                TextButton(
                  onPressed: details.onStepCancel,
                  child: Text(_currentStep == 0 ? 'Cancelar' : 'Atrás'),
                ),
              ],
            );
          },
          steps: [
            Step(
              title: const Text('Información'),
              isActive: _currentStep >= 0,
              content: _buildInfoStep(clientsAsync),
            ),
            Step(
              title: const Text('Productos'),
              isActive: _currentStep >= 1,
              content: _buildProductsStep(),
            ),
            Step(
              title: const Text('Extras'),
              isActive: _currentStep >= 2,
              content: _buildExtrasStep(),
            ),
            Step(
              title: const Text('Finanzas'),
              isActive: _currentStep >= 3,
              content: _buildFinancialsStep(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoStep(AsyncValue<ClientsState> clientsAsync) {
    return Column(
      children: [
        TextFormField(
          controller: _serviceTypeController,
          decoration: const InputDecoration(labelText: 'Tipo de servicio'),
          validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
        ),
        const SizedBox(height: 12),
        _buildClientPicker(clientsAsync),
        const SizedBox(height: 12),
        TextFormField(
          controller: _locationController,
          decoration: const InputDecoration(labelText: 'Lugar'),
          validator: (value) => value == null || value.isEmpty ? 'Requerido' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _cityController,
          decoration: const InputDecoration(labelText: 'Ciudad'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _numPeopleController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Numero de personas'),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickDate,
                icon: const Icon(Icons.calendar_today),
                label: Text(DateFormatter.format(_eventDate)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickStartTime,
                icon: const Icon(Icons.schedule),
                label: Text(_formatTime(_startTime)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickEndTime,
                icon: const Icon(Icons.schedule),
                label: Text(_formatTime(_endTime)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _status,
          items: const [
            DropdownMenuItem(value: 'quoted', child: Text('Cotizado')),
            DropdownMenuItem(value: 'confirmed', child: Text('Confirmado')),
            DropdownMenuItem(value: 'completed', child: Text('Completado')),
            DropdownMenuItem(value: 'cancelled', child: Text('Cancelado')),
          ],
          onChanged: (value) => setState(() => _status = value ?? 'quoted'),
          decoration: const InputDecoration(labelText: 'Estado'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _notesController,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Notas'),
        ),
      ],
    );
  }

  Widget _buildProductsStep() {
    return Column(
      children: [
        ElevatedButton.icon(
          onPressed: _pickProduct,
          icon: const Icon(Icons.add),
          label: const Text('Agregar producto'),
        ),
        const SizedBox(height: 12),
        if (_selectedProducts.isEmpty)
          const Text('No hay productos agregados')
        else
          ..._selectedProducts.map((item) {
            return Card(
              child: ListTile(
                title: Text(item['product_name'] ?? 'Producto'),
                subtitle: Text('Cantidad: ${item['quantity']} · Precio: ${item['unit_price']}'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => setState(() => _selectedProducts.remove(item)),
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildExtrasStep() {
    return Column(
      children: [
        ElevatedButton.icon(
          onPressed: _addExtra,
          icon: const Icon(Icons.add),
          label: const Text('Agregar extra'),
        ),
        const SizedBox(height: 12),
        if (_extras.isEmpty)
          const Text('No hay extras agregados')
        else
          ..._extras.map((item) {
            return Card(
              child: ListTile(
                title: Text(item['description'] ?? 'Extra'),
                subtitle: Text('Costo: ${item['cost']} · Precio: ${item['price']}'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => setState(() => _extras.remove(item)),
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildFinancialsStep() {
    final productsSubtotal = _selectedProducts.fold(0.0, (sum, item) {
      final quantity = (item['quantity'] as num?)?.toDouble() ?? 0;
      final unitPrice = (item['unit_price'] as num?)?.toDouble() ?? 0;
      final discount = (item['discount'] as num?)?.toDouble() ?? 0;
      return sum + (quantity * (unitPrice - discount));
    });
    final extrasSubtotal = _extras.fold(0.0, (sum, item) {
      final price = (item['price'] as num?)?.toDouble() ?? 0;
      return sum + price;
    });
    final subtotal = productsSubtotal + extrasSubtotal;
    final discountPercent = double.tryParse(_discountController.text.trim()) ?? 0;
    final discounted = subtotal * (1 - (discountPercent / 100));
    final taxRate = double.tryParse(_taxRateController.text.trim()) ?? 0;
    final taxAmount = _requiresInvoice ? (discounted * (taxRate / 100)) : 0.0;
    final total = discounted + taxAmount;

    return Column(
      children: [
        SwitchListTile(
          title: const Text('Requiere factura'),
          value: _requiresInvoice,
          onChanged: (value) => setState(() => _requiresInvoice = value),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _taxRateController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'IVA (%)'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _discountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Descuento (%)'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _depositPercentController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Depósito (%)'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _cancellationDaysController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Días de cancelación'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _refundController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Reembolso (%)'),
        ),
        const SizedBox(height: 16),
        _buildSummaryRow('Subtotal', subtotal),
        _buildSummaryRow('Descuento', subtotal - discounted),
        _buildSummaryRow('IVA', taxAmount),
        _buildSummaryRow('Total', total),
      ],
    );
  }

  Widget _buildSummaryRow(String label, double value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(CurrencyFormatter.format(value)),
        ],
      ),
    );
  }

  Future<void> _pickDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _eventDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (selected != null) {
      setState(() => _eventDate = selected);
    }
  }

  Future<void> _pickStartTime() async {
    final selected = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );
    if (selected != null) {
      setState(() => _startTime = selected);
    }
  }

  Future<void> _pickEndTime() async {
    final selected = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );
    if (selected != null) {
      setState(() => _endTime = selected);
    }
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClientId == null || _selectedClientId!.isEmpty) return;

    final productsSubtotal = _selectedProducts.fold(0.0, (sum, item) {
      final quantity = (item['quantity'] as num?)?.toDouble() ?? 0;
      final unitPrice = (item['unit_price'] as num?)?.toDouble() ?? 0;
      final discount = (item['discount'] as num?)?.toDouble() ?? 0;
      return sum + (quantity * (unitPrice - discount));
    });
    final extrasSubtotal = _extras.fold(0.0, (sum, item) {
      final price = (item['price'] as num?)?.toDouble() ?? 0;
      return sum + price;
    });
    final subtotal = productsSubtotal + extrasSubtotal;
    final discountPercent = double.tryParse(_discountController.text.trim()) ?? 0;
    final discounted = subtotal * (1 - (discountPercent / 100));
    final taxRate = double.tryParse(_taxRateController.text.trim()) ?? 0;
    final taxAmount = _requiresInvoice ? (discounted * (taxRate / 100)) : 0.0;
    final totalAmount = discounted + taxAmount;

    final depositPercent = double.tryParse(_depositPercentController.text.trim()) ?? 0;
    final numPeople = int.tryParse(_numPeopleController.text.trim()) ?? 0;
    final cancellationDays = double.tryParse(_cancellationDaysController.text.trim()) ?? 0;
    final refundPercent = double.tryParse(_refundController.text.trim()) ?? 0;

    setState(() => _isSubmitting = true);
    try {
      String? eventId;
      if (_isEdit && widget.eventId != null) {
        await ref.read(eventDetailProvider.notifier).updateEvent(widget.eventId!, {
          'client_id': _selectedClientId,
          'event_date': DateFormatter.format(_eventDate, pattern: 'yyyy-MM-dd'),
          'start_time': _formatTime(_startTime),
          'end_time': _formatTime(_endTime),
          'service_type': _serviceTypeController.text.trim(),
          'num_people': numPeople,
          'status': _status,
          'discount': discountPercent,
          'requires_invoice': _requiresInvoice,
          'tax_rate': taxRate,
          'tax_amount': taxAmount,
          'total_amount': totalAmount,
          'location': _locationController.text.trim(),
          'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
          'deposit_percent': depositPercent,
          'cancellation_days': cancellationDays,
          'refund_percent': refundPercent,
          'notes': _notesController.text.trim(),
        });
        eventId = widget.eventId;
      } else {
        eventId = await ref.read(eventsProvider.notifier).createEvent({
          'client_id': _selectedClientId,
          'event_date': DateFormatter.format(_eventDate, pattern: 'yyyy-MM-dd'),
          'start_time': _formatTime(_startTime),
          'end_time': _formatTime(_endTime),
          'service_type': _serviceTypeController.text.trim(),
          'num_people': numPeople,
          'status': _status,
          'discount': discountPercent,
          'requires_invoice': _requiresInvoice,
          'tax_rate': taxRate,
          'tax_amount': taxAmount,
          'total_amount': totalAmount,
          'location': _locationController.text.trim(),
          'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
          'deposit_percent': depositPercent,
          'cancellation_days': cancellationDays,
          'refund_percent': refundPercent,
          'notes': _notesController.text.trim(),
        });
      }

      if (eventId != null) {
        await ref.read(eventDetailProvider.notifier).updateEventItems(
              eventId,
              products: _selectedProducts
                  .map((p) => EventProductEntity(
                        id: p['id']?.toString() ?? '',
                        eventId: eventId ?? '',
                        productId: p['product_id']?.toString() ?? '',
                        productName: p['product_name']?.toString() ?? 'Producto',
                        productCategory: p['product_category']?.toString(),
                        quantity: (p['quantity'] as num?)?.toDouble() ?? 0,
                        unitPrice: (p['unit_price'] as num?)?.toDouble() ?? 0,
                        discount: (p['discount'] as num?)?.toDouble() ?? 0,
                      ))
                  .toList(),
              extras: _extras
                  .map((e) => EventExtraEntity(
                        id: e['id']?.toString() ?? '',
                        eventId: eventId ?? '',
                        description: e['description']?.toString() ?? '',
                        cost: (e['cost'] as num?)?.toDouble() ?? 0,
                        price: (e['price'] as num?)?.toDouble() ?? 0,
                        excludeUtility: e['exclude_utility'] as bool? ?? false,
                      ))
                  .toList(),
            );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEdit ? 'Evento actualizado' : 'Evento creado')),
        );
        context.pop();
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _handleStepContinue() {
    if (_currentStep < 3) {
      setState(() => _currentStep += 1);
    } else {
      _submit();
    }
  }

  void _handleStepCancel() {
    if (_currentStep == 0) {
      context.pop();
    } else {
      setState(() => _currentStep -= 1);
    }
  }

  Future<void> _pickProduct() async {
    await ref.read(productsProvider.notifier).loadProducts();
    final products = ref.read(productsProvider).valueOrNull?.products ?? [];
    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        final searchController = TextEditingController();
        return StatefulBuilder(builder: (context, setModalState) {
          final query = searchController.text.trim().toLowerCase();
          final filtered = products.where((p) {
            if (query.isEmpty) return true;
            return p.name.toLowerCase().contains(query) || p.category.toLowerCase().contains(query);
          }).toList();

          return Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: searchController,
                  decoration: const InputDecoration(
                    labelText: 'Buscar producto',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (_) => setModalState(() {}),
                ),
                const SizedBox(height: 12),
                if (filtered.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Text('Sin resultados'),
                  )
                else
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final product = filtered[index];
                        return ListTile(
                          title: Text(product.name),
                          subtitle: Text(product.category),
                          trailing: Text(product.formattedPrice),
                          onTap: () async {
                            Navigator.pop(context);
                            await _showProductConfig(product);
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          );
        });
      },
    );
  }

  Future<void> _showProductConfig(ProductEntity product) async {
    final quantityController = TextEditingController(text: '1');
    final priceController = TextEditingController(text: product.basePrice.toString());
    final discountController = TextEditingController(text: '0');

    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(product.name),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: quantityController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Cantidad'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: priceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Precio unitario'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: discountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Descuento'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                final quantity = double.tryParse(quantityController.text.trim()) ?? 1;
                final unitPrice = double.tryParse(priceController.text.trim()) ?? product.basePrice;
                final discount = double.tryParse(discountController.text.trim()) ?? 0;
                setState(() {
                  _selectedProducts.add({
                    'product_id': product.id,
                    'product_name': product.name,
                    'product_category': product.category,
                    'quantity': quantity,
                    'unit_price': unitPrice,
                    'discount': discount,
                  });
                });
                Navigator.pop(context);
              },
              child: const Text('Agregar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _addExtra() async {
    final descriptionController = TextEditingController();
    final costController = TextEditingController(text: '0');
    final priceController = TextEditingController(text: '0');
    bool excludeUtility = false;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Agregar extra'),
          content: StatefulBuilder(
            builder: (context, setDialogState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(labelText: 'Descripción'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: costController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Costo'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: priceController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Precio'),
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Excluir utilidad'),
                    value: excludeUtility,
                    onChanged: (value) => setDialogState(() => excludeUtility = value),
                  ),
                ],
              );
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _extras.add({
                    'description': descriptionController.text.trim(),
                    'cost': double.tryParse(costController.text.trim()) ?? 0,
                    'price': double.tryParse(priceController.text.trim()) ?? 0,
                    'exclude_utility': excludeUtility,
                  });
                });
                Navigator.pop(context);
              },
              child: const Text('Agregar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _loadEvent() async {
    final id = widget.eventId;
    if (id == null) return;
    if (_hasLoadedDetails) return;
    _hasLoadedDetails = true;
    await ref.read(eventDetailProvider.notifier).loadEventDetail(id);
    final detail = ref.read(eventDetailProvider).valueOrNull;
    final event = detail?.event;
    if (event == null) return;

    setState(() {
      _serviceTypeController.text = event.serviceType;
      _locationController.text = event.location;
      _cityController.text = event.city ?? '';
      _notesController.text = event.notes ?? '';
      _depositPercentController.text = event.depositPercent.toString();
      _numPeopleController.text = event.numPeople.toString();
      _taxRateController.text = event.taxRate.toString();
      _discountController.text = event.discount.toString();
      _refundController.text = event.refundPercent.toString();
      _cancellationDaysController.text = event.cancellationDays.toString();
      _requiresInvoice = event.requiresInvoice;
      _status = event.status;
      _eventDate = event.eventDate;
      _startTime = _parseTime(event.startTime);
      _endTime = _parseTime(event.endTime);
      _selectedClientId = event.clientId;
      _selectedClientName = event.clientName;

      _selectedProducts.clear();
      _extras.clear();

      for (final product in detail?.products ?? []) {
        _selectedProducts.add({
          'id': product.id,
          'product_id': product.productId,
          'product_name': product.productName,
          'product_category': product.productCategory,
          'quantity': product.quantity,
          'unit_price': product.unitPrice,
          'discount': product.discount,
        });
      }
      for (final extra in detail?.extras ?? []) {
        _extras.add({
          'id': extra.id,
          'description': extra.description,
          'cost': extra.cost,
          'price': extra.price,
          'exclude_utility': extra.excludeUtility,
        });
      }
    });
  }

  TimeOfDay _parseTime(String value) {
    final parts = value.split(':');
    if (parts.length >= 2) {
      final hour = int.tryParse(parts[0]) ?? 0;
      final minute = int.tryParse(parts[1]) ?? 0;
      return TimeOfDay(hour: hour, minute: minute);
    }
    return const TimeOfDay(hour: 0, minute: 0);
  }

  Widget _buildClientPicker(AsyncValue<ClientsState> clientsAsync) {
    return clientsAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (error, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('No se pudo cargar clientes'),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => ref.read(clientsProvider.notifier).refresh(),
            child: const Text('Reintentar'),
          ),
        ],
      ),
      data: (state) {
        final clients = (state as ClientsState?)?.clients ?? const <ClientEntity>[];
        if (clients.isEmpty) {
          return const Text('No hay clientes disponibles');
        }

        return TextFormField(
          readOnly: true,
          decoration: InputDecoration(
            labelText: 'Cliente',
            hintText: 'Selecciona un cliente',
            suffixIcon: const Icon(Icons.keyboard_arrow_down),
          ),
          controller: TextEditingController(text: _selectedClientName ?? ''),
          onTap: () => _showClientPicker(clients),
          validator: (_) => _selectedClientId == null || _selectedClientId!.isEmpty ? 'Requerido' : null,
        );
      },
    );
  }

  Future<void> _showClientPicker(List<ClientEntity> clients) async {
    final searchController = TextEditingController();
    final result = await showModalBottomSheet<dynamic>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final query = searchController.text.trim().toLowerCase();
            final filtered = clients.where((client) {
              if (query.isEmpty) return true;
              return client.displayName.toLowerCase().contains(query) ||
                  client.email.toLowerCase().contains(query);
            }).toList()
              ..sort((a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()));

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    leading: const Icon(Icons.person_add),
                    title: const Text('Crear cliente'),
                    onTap: () => Navigator.pop(context, '_create'),
                  ),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  TextField(
                    controller: searchController,
                    decoration: const InputDecoration(
                      labelText: 'Buscar cliente',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (_) => setModalState(() {}),
                  ),
                  const SizedBox(height: 12),
                  if (filtered.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text('Sin resultados'),
                    )
                  else
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final client = filtered[index];
                          return ListTile(
                            title: Text(client.displayName),
                            subtitle: Text(client.email),
                            onTap: () => Navigator.pop(context, client),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
    searchController.dispose();

    if (!mounted) return;
    if (result == '_create') {
      await context.push('/clients/new');
      if (mounted) {
        await ref.read(clientsProvider.notifier).loadClients();
        final latestClients = ref.read(clientsProvider).valueOrNull?.clients ?? const <ClientEntity>[];
        if (latestClients.isNotEmpty) {
          final latest = latestClients.first;
          setState(() {
            _selectedClientId = latest.id;
            _selectedClientName = latest.displayName;
          });
        }
      }
      return;
    }

    if (result is ClientEntity) {
      setState(() {
        _selectedClientId = result.id;
        _selectedClientName = result.displayName;
      });
    }
  }
}

class CalendarPage extends ConsumerWidget {
  const CalendarPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventsProvider);

    return Scaffold(
      appBar: const CustomAppBar(title: 'Calendario'),
      body: eventsAsync.when(
        loading: () => const LoadingWidget(message: 'Cargando eventos...'),
        error: (error, stack) => app_widgets.ErrorWidget(
          message: error.toString(),
          onRetry: () => ref.read(eventsProvider.notifier).refresh(),
        ),
        data: (state) {
          if (state.events.isEmpty) {
            return const Center(child: Text('No hay eventos en el calendario'));
          }

          final grouped = <String, List<EventEntity>>{};
          for (final event in state.events) {
            final key = DateFormatter.format(event.eventDate);
            grouped.putIfAbsent(key, () => []).add(event);
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: grouped.entries.map((entry) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.key,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  ...entry.value.map((event) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(event.serviceType),
                        subtitle: Text(event.clientName),
                        trailing: Text(event.startTime),
                        onTap: () => context.push('/events/${event.id}'),
                      )),
                  const SizedBox(height: 16),
                ],
              );
            }).toList(),
          );
        },
      ),
    );
  }
}
