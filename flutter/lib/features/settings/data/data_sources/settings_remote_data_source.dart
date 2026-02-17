import 'package:eventosapp/config/api_config.dart';
import 'package:eventosapp/core/api/api_client.dart';

class SettingsRemoteDataSource {
  final ApiClient _apiClient;

  SettingsRemoteDataSource({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<Map<String, dynamic>> getProfile() async {
    final response = await _apiClient.get('${ApiConfig.auth}/me');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> payload) async {
    final response = await _apiClient.put('${ApiConfig.users}/me', data: payload);
    return response.data as Map<String, dynamic>;
  }
}
