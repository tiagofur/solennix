import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/features/events/presentation/providers/events_state.dart';
import 'package:eventosapp/features/events/domain/repositories/event_repository.dart';
import 'package:eventosapp/features/events/data/data_sources/event_remote_data_source.dart';
import 'package:eventosapp/core/api/api_client_provider.dart';
import 'package:eventosapp/features/events/domain/entities/event_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_product_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_extra_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_ingredient_entity.dart';
import 'package:eventosapp/config/api_config.dart';
import 'package:eventosapp/core/api/api_client.dart';
import 'package:eventosapp/core/api/api_client_provider.dart';

final eventsProvider = AsyncNotifierProvider<EventsNotifier, EventsState>(
  () => EventsNotifier(),
);

final eventRepositoryProvider = Provider<EventRepository>((ref) {
  final remoteDataSource = ref.watch(eventRemoteDataSourceProvider);
  return EventRepository(remoteDataSource: remoteDataSource);
});

final eventRemoteDataSourceProvider = Provider<EventRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return EventRemoteDataSource(apiClient: apiClient);
});

final eventProductsApiProvider = Provider<ApiClient>((ref) {
  return ref.watch(apiClientProvider);
});

final eventDetailProvider = AsyncNotifierProvider<EventDetailNotifier, EventDetailState>(
  () => EventDetailNotifier(),
);

class EventsNotifier extends AsyncNotifier<EventsState> {
  late final EventRepository _repository;

  Future<void> loadEvents({
    int page = 1,
    String? status,
    String? clientId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    state = const AsyncLoading();
    try {
      final response = await _repository.getEvents(
        page: page,
        status: status,
        clientId: clientId,
        startDate: startDate,
        endDate: endDate,
      );

      final events = response.events.map(EventEntity.fromModel).toList();
      state = AsyncData(
        EventsState().copyWith(
          events: events,
          currentPage: page,
          totalPages: page,
          currentFilter: status,
          isLoading: false,
        ),
      );
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> refresh() async {
    await loadEvents(
      status: state.valueOrNull?.currentFilter,
      page: state.valueOrNull?.currentPage ?? 1,
    );
  }

  Future<String?> createEvent(Map<String, dynamic> eventData) async {
    try {
      final response = await _repository.createEvent(eventData);
      await refresh();
      return response.event.id;
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
    return null;
  }

  Future<void> deleteEvent(String id) async {
    try {
      await _repository.deleteEvent(id);
      await refresh();
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> updateEventStatus(String id, String status) async {
    try {
      await _repository.updateEventStatus(id, status);
      await refresh();
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> filterByStatus(String status) async {
    state = AsyncData(EventsState().withFilter(status));
    await loadEvents(status: status, page: 1);
  }

  Future<void> selectEvent(EventEntity event) async {
    state = AsyncData(EventsState().withEvent(event));
  }

  void clearSelection() {
    state = AsyncData((state.valueOrNull ?? const EventsState()).copyWith(selectedEvent: null));
  }

  @override
  EventsState build() {
    _repository = ref.watch(eventRepositoryProvider);
    loadEvents();
    return const EventsState(isLoading: true);
  }
}

class EventDetailNotifier extends AsyncNotifier<EventDetailState> {
  late final EventRepository _repository;
  late final ApiClient _apiClient;

  Future<void> loadEventDetail(String id) async {
    state = const AsyncLoading();
    try {
      final response = await _repository.getEvent(id);
      final event = EventEntity.fromModel(response.event);
      final products = await _repository.getEventProducts(id);
      final extras = await _repository.getEventExtras(id);
      final ingredients = await _loadIngredients(products);

      state = AsyncData(EventDetailState().copyWith(
        event: event,
        products: products
            .map((e) => EventProductEntity(
                  id: e.id,
                  eventId: e.eventId,
                  productId: e.productId,
                  productName: e.productName,
                  productCategory: e.productCategory,
                  quantity: e.quantity,
                  unitPrice: e.unitPrice,
                  discount: e.discount,
                  totalPrice: e.totalPrice,
                ))
            .toList(),
        extras: extras
            .map((e) => EventExtraEntity(
                  id: e.id,
                  eventId: e.eventId,
                  description: e.description,
                  cost: e.cost,
                  price: e.price,
                  excludeUtility: e.excludeUtility,
                ))
            .toList(),
        ingredients: ingredients,
        isLoading: false,
        errorMessage: null,
      ));
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> updateEvent(String id, Map<String, dynamic> eventData) async {
    state = const AsyncLoading();
    try {
      await _repository.updateEvent(id, eventData);
      await loadEventDetail(id);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> addPayment(String eventId, Map<String, dynamic> paymentData) async {
    try {
      await _repository.addPayment(eventId, paymentData);
      await loadEventDetail(eventId);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> deletePayment(String eventId, String paymentId) async {
    try {
      await _repository.deletePayment(eventId, paymentId);
      await loadEventDetail(eventId);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> updateEventItems(
    String eventId, {
    required List<EventProductEntity> products,
    required List<EventExtraEntity> extras,
  }) async {
    final productsPayload = products.map((p) {
      return {
        'product_id': p.productId,
        'quantity': p.quantity,
        'unit_price': p.unitPrice,
        'discount': p.discount,
      };
    }).toList();

    final extrasPayload = extras.map((e) {
      return {
        'description': e.description,
        'cost': e.cost,
        'price': e.price,
        'exclude_utility': e.excludeUtility,
      };
    }).toList();

    await _repository.updateEventItems(
      eventId,
      products: productsPayload,
      extras: extrasPayload,
    );
  }

  @override
  EventDetailState build() {
    _repository = ref.watch(eventRepositoryProvider);
    _apiClient = ref.watch(eventProductsApiProvider);
    return const EventDetailState();
  }

  Future<List<EventIngredientEntity>> _loadIngredients(List<dynamic> products) async {
    final productIds = products.map((p) => p.productId).toSet().toList();
    if (productIds.isEmpty) return [];

    final results = <Map<String, dynamic>>[];
    for (final productId in productIds) {
      final response = await _apiClient.get('${ApiConfig.products}/$productId/ingredients');
      final data = response.data as List<dynamic>;
      for (final item in data) {
        results.add(item as Map<String, dynamic>);
      }
    }

    final quantities = <String, double>{};
    for (final product in products) {
      quantities[product.productId] = product.quantity;
    }

    final aggregated = <String, EventIngredientEntity>{};
    for (final item in results) {
      final inventoryId = item['inventory_id']?.toString() ?? '';
      final productId = item['product_id']?.toString() ?? '';
      final quantityRequired = (item['quantity_required'] as num?)?.toDouble() ?? 0;
      final productQty = quantities[productId] ?? 0;
      final unitCost = (item['unit_cost'] as num?)?.toDouble() ??
          (item['inventory']?['unit_cost'] as num?)?.toDouble() ??
          0;
      final ingredientName = item['ingredient_name']?.toString() ??
          item['inventory']?['ingredient_name']?.toString() ??
          'Ingrediente';
      final unit = item['unit']?.toString() ?? item['inventory']?['unit']?.toString() ?? '';

      final totalQty = quantityRequired * productQty;
      final totalCost = totalQty * unitCost;

      if (aggregated.containsKey(inventoryId)) {
        final existing = aggregated[inventoryId]!;
        aggregated[inventoryId] = EventIngredientEntity(
          inventoryId: inventoryId,
          name: existing.name,
          unit: existing.unit,
          quantity: existing.quantity + totalQty,
          cost: existing.cost + totalCost,
        );
      } else {
        aggregated[inventoryId] = EventIngredientEntity(
          inventoryId: inventoryId,
          name: ingredientName,
          unit: unit,
          quantity: totalQty,
          cost: totalCost,
        );
      }
    }

    return aggregated.values.toList();
  }
}
