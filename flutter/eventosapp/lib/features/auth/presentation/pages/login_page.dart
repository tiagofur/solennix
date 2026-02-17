import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/features/auth/presentation/providers/auth_provider.dart';
import 'package:eventosapp/features/auth/presentation/providers/auth_state.dart';
import 'package:eventosapp/config/theme.dart';

class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.event,
                  size: 80,
                  color: AppColors.brand,
                ),
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  'EventosApp',
                  style: AppTextStyles.h1.copyWith(
                    color: AppColors.brand,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Gestiona tus eventos',
                  style: AppTextStyles.bodyLarge.copyWith(
                    color: AppColors.gray600,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Correo electrónico',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Contraseña',
                    prefixIcon: Icon(Icons.lock_outlined),
                    obscureText: true,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      ref
                          .read(authProvider.notifier)
                          .login('test@ejemplo.com', 'password123');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brand,
                      foregroundColor: AppColors.white,
                      minimumSize: const Size(double.infinity, 50),
                    ),
                    child: authState.status == AuthStatus.loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AppColors.white,
                            ),
                          )
                        : const Text(
                            'Iniciar Sesión',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
                if (authState.status == AuthStatus.error)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.md),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.errorLight,
                        borderRadius: BorderRadius.circular(AppSpacing.sm),
                      ),
                      child: Text(
                        authState.errorMessage ?? 'Error al iniciar sesión',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.error,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
