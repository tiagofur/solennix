import 'package:go_router/go_router.dart';
import 'app_routes.dart';
import 'package:eventosapp/features/auth/presentation/pages/splash_page.dart';
import 'package:eventosapp/features/auth/presentation/pages/login_page.dart';
import 'package:eventosapp/features/auth/presentation/pages/register_page.dart';
import 'package:eventosapp/features/auth/presentation/pages/forgot_password_page.dart';
import 'package:eventosapp/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:eventosapp/features/events/presentation/pages/events_page.dart';
import 'package:eventosapp/features/clients/presentation/pages/clients_page.dart';
import 'package:eventosapp/features/clients/presentation/pages/client_detail_page.dart';
import 'package:eventosapp/features/clients/presentation/pages/client_form_page.dart';
import 'package:eventosapp/features/products/presentation/pages/products_page.dart';
import 'package:eventosapp/features/products/presentation/pages/product_detail_page.dart';
import 'package:eventosapp/features/products/presentation/pages/product_form_page.dart';
import 'package:eventosapp/features/inventory/presentation/pages/inventory_page.dart';
import 'package:eventosapp/features/inventory/presentation/pages/inventory_detail_page.dart';
import 'package:eventosapp/features/inventory/presentation/pages/inventory_form_page.dart';
import 'package:eventosapp/features/search/presentation/pages/search_page.dart';
import 'package:eventosapp/features/settings/presentation/pages/settings_page.dart';
import 'package:eventosapp/core/storage/secure_storage.dart';
import 'package:eventosapp/shared/widgets/not_found_page.dart';

final appRouter = GoRouter(
  initialLocation: AppRoutes.splash,
  redirect: (context, state) async {
    final location = state.uri.path;
    const publicRoutes = {
      AppRoutes.splash,
      AppRoutes.login,
      AppRoutes.register,
      AppRoutes.forgotPassword,
    };
    final isPublic = publicRoutes.contains(location);
    final token = await SecureStorage.getAccessToken();
    final isLoggedIn = token != null && token.isNotEmpty;

    if (!isLoggedIn && !isPublic) {
      return AppRoutes.login;
    }

    if (isLoggedIn && isPublic) {
      return AppRoutes.dashboard;
    }

    return null;
  },
  errorBuilder: (context, state) {
    return NotFoundPage(message: state.error?.toString());
  },
  routes: [
    GoRoute(
      path: AppRoutes.splash,
      name: 'splash',
      builder: (context, state) => const SplashPage(),
    ),
    GoRoute(
      path: AppRoutes.login,
      name: 'login',
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: AppRoutes.register,
      name: 'register',
      builder: (context, state) => const RegisterPage(),
    ),
    GoRoute(
      path: AppRoutes.forgotPassword,
      name: 'forgot-password',
      builder: (context, state) => const ForgotPasswordPage(),
    ),
    GoRoute(
      path: AppRoutes.dashboard,
      name: 'dashboard',
      builder: (context, state) => const DashboardPage(),
    ),
    GoRoute(
      path: AppRoutes.events,
      name: 'events',
      builder: (context, state) => const EventsPage(),
    ),
    GoRoute(
      path: AppRoutes.eventEdit,
      name: 'event-edit',
      builder: (context, state) {
        final eventId = state.pathParameters['id'] ?? '';
        return EventFormPage(eventId: eventId);
      },
    ),
    GoRoute(
      path: AppRoutes.eventForm,
      name: 'event-form',
      builder: (context, state) => const EventFormPage(),
    ),
    GoRoute(
      path: AppRoutes.eventDetail,
      name: 'event-detail',
      builder: (context, state) {
        final eventId = state.pathParameters['id'] ?? '';
        return EventDetailPage(eventId: eventId);
      },
    ),
    GoRoute(
      path: AppRoutes.calendar,
      name: 'calendar',
      builder: (context, state) => const CalendarPage(),
    ),
    GoRoute(
      path: AppRoutes.clients,
      name: 'clients',
      builder: (context, state) => const ClientsPage(),
    ),
    GoRoute(
      path: AppRoutes.clientForm,
      name: 'client-form',
      builder: (context, state) => const ClientFormPage(),
    ),
    GoRoute(
      path: AppRoutes.clientDetail,
      name: 'client-detail',
      builder: (context, state) {
        final clientId = state.pathParameters['id'] ?? '';
        return ClientDetailPage(clientId: clientId);
      },
    ),
    GoRoute(
      path: AppRoutes.products,
      name: 'products',
      builder: (context, state) => const ProductsPage(),
    ),
    GoRoute(
      path: AppRoutes.productForm,
      name: 'product-form',
      builder: (context, state) => const ProductFormPage(),
    ),
    GoRoute(
      path: AppRoutes.productDetail,
      name: 'product-detail',
      builder: (context, state) {
        final productId = state.pathParameters['id'] ?? '';
        return ProductDetailPage(productId: productId);
      },
    ),
    GoRoute(
      path: AppRoutes.inventory,
      name: 'inventory',
      builder: (context, state) => const InventoryPage(),
    ),
    GoRoute(
      path: AppRoutes.inventoryEdit,
      name: 'inventory-edit',
      builder: (context, state) {
        final inventoryId = state.pathParameters['id'] ?? '';
        return InventoryFormPage(inventoryId: inventoryId);
      },
    ),
    GoRoute(
      path: AppRoutes.inventoryForm,
      name: 'inventory-form',
      builder: (context, state) => const InventoryFormPage(),
    ),
    GoRoute(
      path: AppRoutes.inventoryDetail,
      name: 'inventory-detail',
      builder: (context, state) {
        final inventoryId = state.pathParameters['id'] ?? '';
        return InventoryDetailPage(inventoryId: inventoryId);
      },
    ),
    GoRoute(
      path: AppRoutes.search,
      name: 'search',
      builder: (context, state) => const SearchPage(),
    ),
    GoRoute(
      path: AppRoutes.settings,
      name: 'settings',
      builder: (context, state) => const SettingsPage(),
    ),
    GoRoute(
      path: AppRoutes.profile,
      name: 'profile',
      builder: (context, state) => const ProfilePage(),
    ),
    GoRoute(
      path: AppRoutes.contractSettings,
      name: 'contract-settings',
      builder: (context, state) => const ContractSettingsPage(),
    ),
    GoRoute(
      path: AppRoutes.appSettings,
      name: 'app-settings',
      builder: (context, state) => const AppSettingsPage(),
    ),
  ],
);
