import 'package:eventosapp/features/settings/data/data_sources/settings_remote_data_source.dart';
import 'package:eventosapp/features/settings/data/models/user_profile_model.dart';

class SettingsRepository {
  final SettingsRemoteDataSource _remoteDataSource;

  SettingsRepository({required SettingsRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  Future<UserProfileModel> getProfile() async {
    final data = await _remoteDataSource.getProfile();
    return UserProfileModel.fromJson(data);
  }

  Future<UserProfileModel> updateProfile(UserProfileModel profile) async {
    final data = await _remoteDataSource.updateProfile(profile.toUpdateJson());
    return UserProfileModel.fromJson(data);
  }
}
