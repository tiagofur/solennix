# Estructura de Directorios

Estructura real del proyecto Flutter. Nota: la estructura real difiere del plan original — varios features comparten archivos (p.ej. `events_page.dart` contiene 4 clases) y no existen use cases separados.

## 📁 Árbol de Directorios (Real)

```
flutter/
├── lib/
│   ├── main.dart                        # Punto de entrada
│   │
│   ├── config/                          # Configuración global
│   │   ├── api_config.dart              # URLs base del API
│   │   └── theme.dart                   # Tema y AppColors (brand = 0xFFFF6B35)
│   │
│   ├── core/                            # Código compartido core
│   │   ├── api/                         # Cliente HTTP
│   │   │   ├── api_client.dart          # Cliente Dio con interceptors
│   │   │   ├── api_client_provider.dart # Provider de Riverpod para ApiClient
│   │   │   └── api_exception.dart       # Excepciones personalizadas
│   │   │
│   │   ├── storage/                     # Storage local
│   │   │   └── secure_storage.dart      # Tokens con flutter_secure_storage
│   │   │
│   │   └── utils/                       # Utilidades
│   │       ├── app_router.dart          # GoRouter con todas las rutas + auth guard
│   │       ├── app_routes.dart          # Constantes de rutas (AppRoutes.*)
│   │       ├── date_formatter.dart      # Formateadores de fecha
│   │       ├── formatters.dart          # CurrencyFormatter
│   │       └── pdf_generator.dart       # generateBudgetPDF, generateContractPDF
│   │
│   ├── features/                        # Features del negocio
│   │   │
│   │   ├── auth/                        # Autenticación
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   ├── auth_provider.dart
│   │   │       │   └── auth_state.dart
│   │   │       └── pages/
│   │   │           ├── login_page.dart
│   │   │           ├── register_page.dart
│   │   │           ├── forgot_password_page.dart
│   │   │           └── splash_page.dart
│   │   │
│   │   ├── dashboard/                   # Dashboard
│   │   │   ├── data/
│   │   │   │   └── data_sources/
│   │   │   │       └── dashboard_remote_data_source.dart  # ⚠️ Verificar si tiene mock data
│   │   │   └── presentation/
│   │   │       ├── pages/
│   │   │       │   └── dashboard_page.dart
│   │   │       └── widgets/
│   │   │           └── event_status_chart.dart  # BarChart con fl_chart
│   │   │
│   │   ├── events/                      # Eventos (archivo monolítico)
│   │   │   ├── data/
│   │   │   │   ├── data_sources/
│   │   │   │   │   └── event_remote_data_source.dart
│   │   │   │   └── repositories/
│   │   │   │       └── event_repository.dart    # (en domain/repositories/)
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── event_entity.dart
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   ├── events_provider.dart
│   │   │       │   └── events_state.dart
│   │   │       └── pages/
│   │   │           └── events_page.dart  # ← CONTIENE 4 CLASES (~2400 lineas):
│   │   │                                 #   EventsPage (lista)
│   │   │                                 #   EventDetailPage (4 tabs)
│   │   │                                 #   EventFormPage (4 pasos)
│   │   │                                 #   CalendarPage (table_calendar)
│   │   │
│   │   ├── clients/                     # Clientes
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   │   └── client_model.dart
│   │   │   │   ├── repositories/
│   │   │   │   │   └── clients_repository.dart
│   │   │   │   └── data_sources/
│   │   │   │       └── clients_remote_data_source.dart
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── client_entity.dart  # ClientEntity + ClientEvent + ClientPayment
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   ├── clients_provider.dart
│   │   │       │   └── clients_state.dart
│   │   │       └── pages/
│   │   │           ├── clients_page.dart         # Lista con delete
│   │   │           ├── client_detail_page.dart   # Tabs: Info, Eventos, Pagos
│   │   │           └── client_form_page.dart     # Crear/editar
│   │   │
│   │   ├── products/                    # Productos
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   │   └── product_model.dart  # ProductModel + RecipeIngredientModel
│   │   │   │   ├── repositories/
│   │   │   │   │   └── products_repository.dart
│   │   │   │   └── data_sources/
│   │   │   │       └── products_remote_data_source.dart  # getIngredients, updateIngredients
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── product_entity.dart
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   ├── products_provider.dart  # createProductReturningId, getIngredients, updateIngredients
│   │   │       │   └── products_state.dart
│   │   │       └── pages/
│   │   │           ├── products_page.dart        # Grid con delete
│   │   │           ├── product_detail_page.dart
│   │   │           └── product_form_page.dart    # 5 pasos con receta e ingredientes
│   │   │
│   │   ├── inventory/                   # Inventario
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   │   └── inventory_model.dart
│   │   │   │   ├── repositories/
│   │   │   │   │   └── inventory_repository.dart
│   │   │   │   └── data_sources/
│   │   │   │       └── inventory_remote_data_source.dart
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       └── inventory_entity.dart
│   │   │   └── presentation/
│   │   │       ├── providers/
│   │   │       │   ├── inventory_provider.dart  # searchInventories()
│   │   │       │   └── inventory_state.dart     # searchQuery, filteredInventories
│   │   │       └── pages/
│   │   │           ├── inventory_page.dart        # Lista con busqueda + delete
│   │   │           ├── inventory_detail_page.dart
│   │   │           └── inventory_form_page.dart   # Crear/editar
│   │   │
│   │   ├── search/                      # Busqueda global
│   │   │   └── presentation/
│   │   │       └── pages/
│   │   │           └── search_page.dart
│   │   │
│   │   └── settings/                    # Configuracion (archivo monolítico)
│   │       └── presentation/
│   │           └── pages/
│   │               └── settings_page.dart  # ← CONTIENE 4 CLASES:
│   │                                       #   SettingsPage (menu)
│   │                                       #   ProfilePage (❌ sin persistencia)
│   │                                       #   ContractSettingsPage (❌ sin persistencia)
│   │                                       #   AppSettingsPage (❌ sin persistencia)
│   │
│   └── shared/                          # Componentes compartidos
│       └── widgets/
│           ├── custom_app_bar.dart
│           ├── custom_bottom_nav.dart
│           ├── loading_widget.dart
│           ├── error_widget.dart
│           ├── status_badge.dart
│           └── not_found_page.dart      # Pagina 404
│
├── test/                                # Tests (pendiente)
├── android/
├── ios/
└── pubspec.yaml
```

## Diferencias vs Plan Original

| Plan Original | Realidad |
|---|---|
| `events_list_page.dart`, `event_detail_page.dart`, `event_form_page.dart`, `calendar_page.dart` como archivos separados | Todo en `events_page.dart` (un solo archivo, 4 clases) |
| `settings_page.dart`, `profile_settings_page.dart`, `contract_settings_page.dart`, `app_settings_page.dart` | Todo en `settings_page.dart` (un solo archivo, 4 clases) |
| Carpeta `features/pdf/` con generadores separados | `core/utils/pdf_generator.dart` con 2 funciones top-level |
| Use cases como archivos separados en `domain/usecases/` | No existen — logica en providers/notifiers |
| `clients_list_page.dart` | `clients_page.dart` |
| `inventory_list_page.dart` | `inventory_page.dart` |
| `products_list_page.dart` | `products_page.dart` |
| Carpeta `shared/providers/` con theme_provider, locale_provider | No existen |
| Carpeta `l10n/` para internacionalizacion | No existe |
| `core/storage/local_storage.dart` (Hive) | No existe |
| `core/utils/finance_utils.dart` | No existe — calculos inline en events_page.dart |

## 📝 Convenciones de Nombres (Aplicadas)

### Archivos
- **lowercase_with_underscores**: `event_form_page.dart`, `clients_page.dart`
- **provider files**: `*_provider.dart`
- **state files**: `*_state.dart`
- **entity files**: `*_entity.dart`
- **model files**: `*_model.dart`

### Rutas (AppRoutes)
```dart
// flutter/lib/core/utils/app_routes.dart
class AppRoutes {
  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const forgotPassword = '/forgot-password';
  static const dashboard = '/dashboard';
  static const calendar = '/calendar';
  static const events = '/events';
  static const eventNew = '/events/new';
  static const eventDetail = '/events/:id';
  static const clients = '/clients';
  static const clientNew = '/clients/new';
  static const clientDetail = '/clients/:id';
  static const clientEdit = '/clients/:id/edit';  // agregada
  static const products = '/products';
  static const productNew = '/products/new';
  static const productDetail = '/products/:id';
  static const inventory = '/inventory';
  static const inventoryNew = '/inventory/new';
  static const inventoryDetail = '/inventory/:id';
  static const search = '/search';
  static const settings = '/settings';
}
```
