import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/providers/clients_provider.dart';
import '../../presentation/providers/clients_state.dart';
import '../../domain/entities/client_entity.dart';
import 'package:eventosapp/shared/widgets/custom_app_bar.dart';
import 'package:eventosapp/shared/widgets/loading_widget.dart';
import 'package:eventosapp/shared/widgets/error_widget.dart' as app_widgets;
import 'package:eventosapp/shared/widgets/status_badge.dart';

class ClientDetailPage extends ConsumerStatefulWidget {
  final String clientId;

  const ClientDetailPage({super.key, required this.clientId});

  @override
  ConsumerState<ClientDetailPage> createState() => _ClientDetailPageState();
}

class _ClientDetailPageState extends ConsumerState<ClientDetailPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    Future.microtask(() {
      ref.read(clientsProvider.notifier).loadClientDetail(widget.clientId);
      ref.read(clientsProvider.notifier).loadClientPayments(widget.clientId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final clientsAsync = ref.watch(clientsProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Detalle de Cliente',
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () {
              context.push('/events/new', extra: {'clientId': widget.clientId});
            },
            tooltip: 'Crear evento',
          ),
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              context.push('/clients/${widget.clientId}/edit');
            },
            tooltip: 'Editar',
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'delete') {
                _showDeleteDialog();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Eliminar'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: clientsAsync.when(
        loading: () => const LoadingWidget(message: 'Cargando cliente...'),
        error: (error, stack) => app_widgets.ErrorWidget(
          message: error.toString(),
          onRetry: () => ref
              .read(clientsProvider.notifier)
              .loadClientDetail(widget.clientId),
        ),
        data: (state) {
          final client = state.selectedClient;
          if (client == null) {
            return const Center(child: Text('Cliente no encontrado'));
          }
          return _buildClientContent(context, client, state);
        },
      ),
    );
  }

  Widget _buildClientContent(
      BuildContext context, ClientEntity client, ClientsState state) {
    return Column(
      children: [
        _buildClientHeader(context, client),
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Información'),
            Tab(text: 'Eventos'),
            Tab(text: 'Pagos'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildInfoTab(client),
              _buildEventsTab(client),
              _buildPaymentsTab(state),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildClientHeader(BuildContext context, ClientEntity client) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).primaryColor,
            Theme.of(context).primaryColor.withOpacity(0.7),
          ],
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: Colors.white,
            child: Text(
              client.name.substring(0, 1).toUpperCase(),
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).primaryColor,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  client.displayName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  client.email,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                  ),
                ),
                if (client.city != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    client.city!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.white70,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const StatusBadge(
            label: 'Cliente',
            color: Colors.white,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTab(ClientEntity client) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('Información de Contacto'),
          const SizedBox(height: 16),
          _buildInfoRow(Icons.phone, 'Teléfono', client.formattedPhone),
          if (client.address != null)
            _buildInfoRow(Icons.location_on, 'Dirección', client.address!),
          if (client.city != null)
            _buildInfoRow(Icons.location_city, 'Ciudad', client.city!),
          if (client.notes != null)
            _buildInfoRow(Icons.note, 'Notas', client.notes!),
          const SizedBox(height: 24),
          _buildSectionTitle('Estadísticas'),
          const SizedBox(height: 16),
          _buildStatsGrid(client),
          const SizedBox(height: 24),
          _buildSectionTitle('Registro'),
          const SizedBox(height: 16),
          _buildInfoRow(
              Icons.calendar_today, 'Creado', client.formattedCreatedAt),
          _buildInfoRow(Icons.update, 'Actualizado', client.formattedUpdatedAt),
        ],
      ),
    );
  }

  Widget _buildEventsTab(ClientEntity client) {
    if (client.events.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No hay eventos registrados',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () =>
                  context.push('/events/new', extra: {'clientId': client.id}),
              icon: const Icon(Icons.add),
              label: const Text('Crear evento'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: client.events.length,
      itemBuilder: (context, index) {
        final event = client.events[index];
        return _buildEventCard(event);
      },
    );
  }

  Widget _buildEventCard(ClientEvent event) {
    final statusColor = _getEventStatusColor(event.status);
    final statusText = _getEventStatusText(event.status);
    final pending = event.pendingAmount;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => context.push('/events/${event.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      event.eventName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 14, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    event.formattedDate,
                    style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                  ),
                  if (event.serviceType != null) ...[
                    const SizedBox(width: 16),
                    Icon(Icons.room_service, size: 14, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(
                      event.serviceType!,
                      style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                    ),
                  ],
                  if (event.numPeople != null) ...[
                    const SizedBox(width: 16),
                    Icon(Icons.people, size: 14, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(
                      '${event.numPeople} pers.',
                      style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Total',
                          style:
                              TextStyle(fontSize: 11, color: Colors.grey[500])),
                      Text(
                        event.formattedTotal,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Pendiente',
                          style:
                              TextStyle(fontSize: 11, color: Colors.grey[500])),
                      Text(
                        '\$${pending.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color:
                              pending > 0 ? Colors.red[700] : Colors.green[700],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentsTab(ClientsState state) {
    if (state.payments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.payment, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No hay pagos registrados',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.payments.length,
      itemBuilder: (context, index) {
        final payment = state.payments[index];
        return _buildPaymentCard(payment);
      },
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

  Widget _buildStatsGrid(ClientEntity client) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            Icons.event,
            'Eventos',
            client.eventsCount.toString(),
            Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            Icons.attach_money,
            'Total Gastado',
            '\$${client.totalSpent.toStringAsFixed(2)}',
            Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
      IconData icon, String label, String value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentCard(ClientPayment payment) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.green.withOpacity(0.1),
          child: const Icon(Icons.payment, color: Colors.green),
        ),
        title: Text('\$${payment.amount.toStringAsFixed(2)}'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              payment.eventName.isNotEmpty
                  ? payment.eventName
                  : 'Evento: ${payment.eventId}',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            Text(payment.formattedPaymentDate),
            if (payment.method != null) Text('Método: ${payment.method}'),
            if (payment.notes != null) Text('Notas: ${payment.notes}'),
          ],
        ),
      ),
    );
  }

  String _getEventStatusText(String status) {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendiente';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  Color _getEventStatusColor(String status) {
    switch (status) {
      case 'confirmed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'completed':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  void _showDeleteDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Cliente'),
        content:
            const Text('¿Estás seguro de que deseas eliminar este cliente?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(clientsProvider.notifier).deleteClient(widget.clientId);
              context.pop();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }
}
