import 'package:eventosapp/config/api_config.dart';
import 'package:eventosapp/core/api/api_client.dart';
import '../models/event_models.dart';
import '../models/event_product_model.dart';
import '../models/event_extra_model.dart';

class EventRemoteDataSource {
  final ApiClient _apiClient;

  EventRemoteDataSource({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<EventResponseModel> createEvent(Map<String, dynamic> eventData) async {
    final response = await _apiClient.post(ApiConfig.events, data: eventData);
    return EventResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<EventResponseModel> updateEvent(String id, Map<String, dynamic> eventData) async {
    final response = await _apiClient.put('${ApiConfig.events}/$id', data: eventData);
    return EventResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteEvent(String id) async {
    await _apiClient.delete('${ApiConfig.events}/$id');
  }

  Future<EventResponseModel> getEvent(String id) async {
    final response = await _apiClient.get('${ApiConfig.events}/$id');
    return EventResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<EventsListResponseModel> getEvents({
    int page = 1,
    int pageSize = 20,
    String? status,
    String? clientId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final queryParameters = <String, dynamic>{
      'page': page,
      'limit': pageSize,
    };
    if (status != null && status.isNotEmpty) {
      queryParameters['status'] = status;
    }
    if (clientId != null && clientId.isNotEmpty) {
      queryParameters['client_id'] = clientId;
    }
    if (startDate != null) {
      queryParameters['start'] = startDate.toIso8601String();
    }
    if (endDate != null) {
      queryParameters['end'] = endDate.toIso8601String();
    }

    final response = await _apiClient.get(
      ApiConfig.events,
      queryParameters: queryParameters,
    );
    return EventsListResponseModel.fromJson(response.data);
  }

  Future<void> updateEventStatus(String id, String status) async {
    await _apiClient.put('${ApiConfig.events}/$id', data: {
      'status': status,
    });
  }

  Future<void> addPayment(String eventId, Map<String, dynamic> paymentData) async {
    await _apiClient.post(ApiConfig.payments, data: paymentData);
  }

  Future<void> deletePayment(String eventId, String paymentId) async {
    await _apiClient.delete('${ApiConfig.payments}/$paymentId');
  }

  Future<List<EventProductModel>> getEventProducts(String eventId) async {
    final response = await _apiClient.get('${ApiConfig.events}/$eventId/products');
    final data = response.data as List<dynamic>;
    return data.map((e) => EventProductModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<EventExtraModel>> getEventExtras(String eventId) async {
    final response = await _apiClient.get('${ApiConfig.events}/$eventId/extras');
    final data = response.data as List<dynamic>;
    return data.map((e) => EventExtraModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> updateEventItems(
    String eventId, {
    required List<Map<String, dynamic>> products,
    required List<Map<String, dynamic>> extras,
  }) async {
    await _apiClient.put('${ApiConfig.events}/$eventId/items', data: {
      'products': products,
      'extras': extras,
    });
  }
}
