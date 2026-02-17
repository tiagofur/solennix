import 'package:eventosapp/features/events/data/data_sources/event_remote_data_source.dart';
import 'package:eventosapp/features/events/data/models/event_models.dart';
import 'package:eventosapp/features/events/data/models/event_product_model.dart';
import 'package:eventosapp/features/events/data/models/event_extra_model.dart';

class EventRepository {
  final EventRemoteDataSource _remoteDataSource;

  EventRepository({
    required EventRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  Future<EventResponseModel> createEvent(Map<String, dynamic> eventData) async {
    try {
      return await _remoteDataSource.createEvent(eventData);
    } catch (e) {
      rethrow;
    }
  }

  Future<EventResponseModel> updateEvent(String id, Map<String, dynamic> eventData) async {
    try {
      return await _remoteDataSource.updateEvent(id, eventData);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteEvent(String id) async {
    try {
      await _remoteDataSource.deleteEvent(id);
    } catch (e) {
      rethrow;
    }
  }

  Future<EventResponseModel> getEvent(String id) async {
    try {
      return await _remoteDataSource.getEvent(id);
    } catch (e) {
      rethrow;
    }
  }

  Future<EventsListResponseModel> getEvents({
    int page = 1,
    int pageSize = 20,
    String? status,
    String? clientId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      return await _remoteDataSource.getEvents(
        page: page,
        pageSize: pageSize,
        status: status,
        clientId: clientId,
        startDate: startDate,
        endDate: endDate,
      );
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateEventStatus(String id, String status) async {
    try {
      await _remoteDataSource.updateEventStatus(id, status);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> addPayment(String eventId, Map<String, dynamic> paymentData) async {
    try {
      await _remoteDataSource.addPayment(eventId, paymentData);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deletePayment(String eventId, String paymentId) async {
    try {
      await _remoteDataSource.deletePayment(eventId, paymentId);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<EventProductModel>> getEventProducts(String eventId) async {
    try {
      return await _remoteDataSource.getEventProducts(eventId);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<EventExtraModel>> getEventExtras(String eventId) async {
    try {
      return await _remoteDataSource.getEventExtras(eventId);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateEventItems(
    String eventId, {
    required List<Map<String, dynamic>> products,
    required List<Map<String, dynamic>> extras,
  }) async {
    try {
      await _remoteDataSource.updateEventItems(
        eventId,
        products: products,
        extras: extras,
      );
    } catch (e) {
      rethrow;
    }
  }
}
