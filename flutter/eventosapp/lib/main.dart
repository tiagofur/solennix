import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eventosapp/config/theme.dart';
import 'package:eventosapp/config/api_config.dart';
import 'package:eventosapp/core/storage/hive_init.dart';
import 'package:eventosapp/features/auth/presentation/providers/auth_provider.dart';
import 'package:eventosapp/features/auth/presentation/pages/login_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive
  await HiveInit.init();

  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'EventosApp',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home:
          authState.isAuthenticated ? const DashboardPage() : const LoginPage(),
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        backgroundColor: AppColors.brand,
        foregroundColor: AppColors.white,
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.dashboard,
              size: 80,
              color: AppColors.brand,
            ),
            SizedBox(height: AppSpacing.md),
            const Text(
              'Dashboard en desarrollo...',
              style: AppTextStyles.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
}
