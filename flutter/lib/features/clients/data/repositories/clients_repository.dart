import '../data_sources/clients_remote_data_source.dart';
import '../models/client_model.dart';
import '../../domain/entities/client_entity.dart';

class ClientsRepository {
  final ClientsRemoteDataSource _remoteDataSource;

  ClientsRepository({
    required ClientsRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  Future<List<ClientEntity>> getClients({String? search}) async {
    try {
      final data = await _remoteDataSource.getClients(search: search);
      final clientsList = data as List<dynamic>;
      return clientsList
          .map((json) =>
              ClientModel.fromJson(json as Map<String, dynamic>).toEntity())
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<ClientEntity> getClientById(String id) async {
    try {
      final data = await _remoteDataSource.getClientById(id);
      return ClientModel.fromJson(data).toEntity();
    } catch (e) {
      rethrow;
    }
  }

  Future<ClientEntity> createClient(Map<String, dynamic> data) async {
    try {
      final createdData = await _remoteDataSource.createClient(data);
      return ClientModel.fromJson(createdData).toEntity();
    } catch (e) {
      rethrow;
    }
  }

  Future<ClientEntity> updateClient(
      String id, Map<String, dynamic> data) async {
    try {
      final updatedData = await _remoteDataSource.updateClient(id, data);
      return ClientModel.fromJson(updatedData).toEntity();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteClient(String id) async {
    try {
      await _remoteDataSource.deleteClient(id);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClientPayment>> getClientPayments(String clientId) async {
    try {
      final data = await _remoteDataSource.getClientPayments(clientId);
      final paymentsList = data['payments'] as List<dynamic>;
      return paymentsList
          .map((json) => ClientPayment(
                id: json['id'] as String,
                eventId: json['eventId'] as String? ??
                    json['event_id'] as String? ??
                    '',
                eventName: json['event_name'] as String? ??
                    json['eventName'] as String? ??
                    '',
                paymentDate: DateTime.parse(json['payment_date'] as String),
                amount: (json['amount'] as num).toDouble(),
                method: json['payment_method'] as String?,
                notes: json['notes'] as String?,
              ))
          .toList();
    } catch (e) {
      rethrow;
    }
  }
}
