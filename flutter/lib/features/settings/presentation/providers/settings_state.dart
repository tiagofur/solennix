import 'package:eventosapp/features/settings/data/models/user_profile_model.dart';

class SettingsState {
  final UserProfileModel? profile;
  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;

  const SettingsState({
    this.profile,
    this.isLoading = false,
    this.isSaving = false,
    this.errorMessage,
  });

  SettingsState copyWith({
    UserProfileModel? profile,
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
  }) {
    return SettingsState(
      profile: profile ?? this.profile,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: errorMessage,
    );
  }

  SettingsState loading() => copyWith(isLoading: true, errorMessage: null);

  SettingsState saving() => copyWith(isSaving: true, errorMessage: null);

  SettingsState loaded(UserProfileModel profile) => copyWith(
        profile: profile,
        isLoading: false,
        isSaving: false,
        errorMessage: null,
      );

  SettingsState error(String message) => copyWith(
        isLoading: false,
        isSaving: false,
        errorMessage: message,
      );
}
