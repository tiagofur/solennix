import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/features/auth/presentation/providers/auth_state.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState.initial());

  Future<void> login(String email, String password) async {
    state = AuthState.loading();

    try {
      // TODO: Implementar llamada a API de login
      // Simulación temporal
      await Future.delayed(const Duration(seconds: 2));

      state = AuthState.authenticated(
        UserEntity(
          id: '1',
          email: email,
          name: 'Usuario Demo',
          plan: 'basic',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
      );
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> logout() async {
    state = AuthState.loading();

    try {
      // TODO: Implementar logout de API
      await Future.delayed(const Duration(milliseconds: 500));
      state = AuthState.unauthenticated();
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
