# Historial de Sesiones — Solennix Agent Progress

> Bitácora de progreso de features implementadas y validadas mediante el arnés.

---

## Sesión 2026-06-01: Configuración del Arnés de Agentes
- **Feature ID:** 1 (harness-setup)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1229 tests en verde).
- **Entregables:**
  - `AGENTS.md` (Mapa de navegación global)
  - `CHECKPOINTS.md` (Criterios objetivos de aceptación)
  - `./init.sh` (Ejecutor de validación de tests)
  - `docs/agents/` (architecture, conventions, verification)
  - `.agents/agents/` (Definiciones de subagentes Leader, Implementer, Reviewer)
  - `progress/` (Estructura de bitácoras `current.md` y `history.md`)

## Sesión 2026-06-01: Internacionalización del Dashboard en iOS
- **Feature ID:** i18n-slice-dashboard (SDD en memoria)
- **Resultado:** COMPLETO y Validado con tests de localización.
- **Entregables:**
  - `Localizable.xcstrings` (76 claves `dashboard.*` inyectadas in inglés y español)
  - `DashboardLocalizationTests.swift` (Pruebas unitarias de resolución dinámica)

## Sesión 2026-06-01: Internacionalización de Productos e Inventario en iOS
- **Feature ID:** 2 (i18n-slice-products-inventory)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1229 tests en verde).
- **Entregables:**
  - `ProductStrings.swift` (Propiedades y métodos refactorizados a dinámica computada)
  - `InventoryStrings.swift` (Propiedades y métodos refactorizados a dinámica computada)
  - `Localizable.xcstrings` (110+ claves `products.*` e `inventory.*` inyectadas)
  - `ProductsInventoryLocalizationTests.swift` (Suite completa de tests unitarios dynamic-locale)

## Sesión 2026-06-01: Internacionalización de Clientes y Quick Quote en iOS
- **Feature ID:** 3 (i18n-slice-clients)
- **Resultado:** COMPLETO y Validado con `xcodebuild` (2/2 tests dinámicos de localización en verde, 100% compila y pasa).
- **Entregables:**
  - `QuickQuoteStrings.swift` (Propiedades y métodos refactorizados a computados vía FeatureL10n)
  - `ClientListView.swift` / `ClientListViewModel.swift` (Lookups estáticos migrados a dinámicos)
  - `ClientDetailView.swift` (Lookups estáticos migrados a dinámicos y formateador de mes localizado)
  - `ClientFormView.swift` / `ClientFormViewModel.swift` (Lookups estáticos y errores migrados a dinámicos)
  - `ClientsLocalizationTests.swift` (Pruebas unitarias de verificación dinámica ES/EN)

## Sesión 2026-06-01: Internacionalización de Events en iOS
- **Feature ID:** 4 (i18n-slice-events)
- **Resultado:** COMPLETO y Validado con `xcodebuild` (2/2 tests dinámicos de localización en verde, 100% de la suite compila y pasa).
- **Entregables:**
  - `ClientPortalShareStrings.swift` (Propiedades y métodos refactorizados a computados vía FeatureL10n)
  - `Localizable.xcstrings` (25 nuevas claves `events.share.*` inyectadas)
  - `EventsLocalizationTests.swift` (Suite completa de tests unitarios de verificación dinámica ES/EN)

## Sesión 2026-06-01: Internacionalización de Staff & Teams en iOS
- **Feature ID:** 5 (i18n-slice-staff)
- **Resultado:** COMPLETO y Validado con `xcodebuild` (2/2 tests dinámicos de localización en verde, 100% de la suite compila y pasa).
- **Entregables:**
  - `StaffStrings.swift` (Propiedades y métodos refactorizados a computados vía FeatureL10n)
  - `Localizable.xcstrings` (70+ nuevas claves `staff.*` inyectadas)
  - `StaffLocalizationTests.swift` (Suite completa de tests unitarios de verificación dinámica ES/EN)

## Sesión 2026-06-01: Internacionalización de Calendar en iOS
- **Feature ID:** 6 (i18n-slice-calendar)
- **Resultado:** COMPLETO y Validado con `xcodebuild` (2/2 tests dinámicos de localización en verde, 100% de la suite compila y pasa).
- **Entregables:**
  - `CalendarStrings.swift` (Constantes centralizadas dinámicas computadas vía FeatureL10n)
  - `BlockDateSheet.swift` / `BlockedDatesSheet.swift` (Vistas SwiftUI migradas a CalendarStrings)
  - `CalendarGridView.swift` / `CalendarView.swift` (Vistas SwiftUI migradas a CalendarStrings y locales dinámicas)
  - `CalendarLocalizationTests.swift` (Suite completa de tests unitarios de verificación dinámica ES/EN)

## Sesión 2026-06-01: Internacionalización de Payments en iOS
- **Feature ID:** 7 (i18n-slice-payments)
- **Resultado:** COMPLETO y Validado con `xcodebuild` (2/2 tests dinámicos de localización en verde, 100% de la suite compila y pasa).
- **Entregables:**
  - `PaymentsStrings.swift` (Constantes centralizadas dinámicas computadas vía FeatureL10n)
  - `PaymentInboxView.swift` / `PaymentInboxComponents.swift` (Vistas SwiftUI migradas a PaymentsStrings)
  - `PaymentInboxViewModel.swift` (Mapeo de errores refactorizado de Locale.current a PaymentsStrings)
  - `Localizable.xcstrings` (28 nuevas claves `payments.*` inyectadas)
  - `PaymentsLocalizationTests.swift` (Suite completa de tests unitarios de verificación dinámica ES/EN)


## Sesión 2026-06-01: Internacionalización de Onboarding en iOS
- **Feature ID:** 8 (i18n-slice-onboarding)
- **Resultado:** COMPLETO y Validado con `xcodebuild` (16/16 tests en verde).
- **Entregables:**
  - `OnboardingStrings.swift` (15 claves dinámicas: actions, 4 páginas, brand)
  - `OnboardingView.swift` (iPhone + iPad render paths migrados a OnboardingStrings)
  - `CalendarStrings.swift` (agregado `unknownClient`)
  - `CalendarViewModel.swift` (reemplazado último `String(localized:)` con `CalendarStrings.unknownClient`)
  - `ProductDetailView.swift` (reemplazado último `String(localized:)` con `FeatureL10n.text()`)
  - `Localizable.xcstrings` (22 claves `onboarding.*` + `calendar.unknown_client`)
  - `OnboardingLocalizationTests.swift` (16/16 tests ES/EN)
- **Nota:** Ningún `String(localized:bundle:)` residual queda en el codebase.

## Sesión 2026-06-02: Internacionalización de Auth y Settings en iOS
- **Feature ID:** 9 (i18n-slice-auth-settings)
- **Resultado:** COMPLETO y Validado con `./init.sh` y `xcodebuild` (32 tests de localización en verde, 1229 tests globales en verde).
- **Entregables:**
  - `AuthStrings.swift` (Constantes centralizadas dinámicas computadas vía FeatureL10n)
  - `SettingsStrings.swift` (Constantes centralizadas dinámicas computadas vía FeatureL10n)
  - `LoginView.swift`, `ForgotPasswordView.swift`, `ResetPasswordView.swift`, `RegisterView.swift`, `TeamInviteAcceptView.swift`, `AuthViewModel.swift` refactorizados para usar `AuthStrings`
  - `BiometricGateView.swift` internacionalizado
  - `SettingsView.swift`, `AccountDeletionView.swift` y `ChangePasswordView.swift` refactorizados para usar `SettingsStrings`
  - `Localizable.xcstrings` actualizado con claves de biometría y de eliminación de cuenta mediante scripts inyectores
  - `AuthLocalizationTests.swift` (Suite completa de tests unitarios de verificación dinámica ES/EN)
  - `SettingsLocalizationTests.swift` (Suite completa de tests unitarios de verificación dinámica ES/EN)

## Sesión 2026-06-02: Internacionalización de Búsqueda (Search) en iOS
- **Feature ID:** 10 (i18n-slice-search)
- **Resultado:** COMPLETO y Validado con `./init.sh` y `xcodebuild` (19 tests de localización en verde, 1229 tests globales en verde).
- **Entregables:**
  - `SearchStrings.swift` (Constantes centralizadas dinámicas computadas y formateadas vía FeatureL10n)
  - `SearchView.swift` refactorizado por completo para usar `SearchStrings`
  - `SearchLocalizationTests.swift` (Suite completa de 19 tests unitarios de verificación dinámica ES/EN)

## Sesión 2026-06-02: Internacionalización de Links de Formulario (EventFormLinks) en iOS
- **Feature ID:** 11 (i18n-slice-event-form-links)
- **Resultado:** COMPLETO y Validado con `./init.sh` y `xcodebuild` (71 tests de localización en verde, 1229 tests globales en verde).
- **Entregables:**
  - `EventFormLinksStrings.swift` (Constantes centralizadas dinámicas computadas y formateadas vía FeatureL10n)
  - `EventFormLinksView.swift` refactorizado por completo para usar `EventFormLinksStrings`
  - `EventFormLinksViewModel.swift` refactorizado para usar `EventFormLinksStrings` para estados y errores
  - `Localizable.xcstrings` actualizado con las 36 claves del módulo mediante script inyector
  - `EventFormLinksLocalizationTests.swift` (Suite completa de 71 tests unitarios de verificación dinámica ES/EN)

## Sesión 2026-06-02: Internacionalización del Módulo Común (Common) en iOS
- **Feature ID:** 12 (i18n-slice-common)
- **Resultado:** COMPLETO y Validado con `./init.sh` y `xcodebuild` (41 tests de localización en verde, 1229 tests globales en verde).
- **Entregables:**
  - `CommonStrings.swift` (Constantes centralizadas dinámicas computadas vía FeatureL10n)
  - `OnboardingTips.swift` refactorizado para usar `CommonStrings` y simplificar idioma manual
  - `QuickActionsFAB.swift` refactorizado para usar `CommonStrings`
  - `PaywallSheet.swift` refactorizado para usar `CommonStrings`
  - `PaymentEntrySheet.swift` refactorizado para usar `CommonStrings` en inicializadores y labels
  - `Localizable.xcstrings` actualizado con las 20 claves del módulo mediante script inyector
  - `CommonLocalizationTests.swift` (Suite completa de 41 tests unitarios de verificación dinámica ES/EN)

## Sesión 2026-06-02: Paridad y Auditoría de Internacionalización en Android
- **Feature ID:** i18n-android-parity
- **Resultado:** COMPLETO y Validado (100% de paridad clave por clave en todos los módulos de Android).
- **Entregables:**
  - 14 traducciones al inglés inyectadas en `feature/auth/src/main/res/values-en/strings.xml` correspondientes a las llaves base en español.
  - Script de validación automatizada (`audit_android_strings.py`) para evitar regresiones de llaves en Android.

## Sesión 2026-06-02: Internacionalización de la Pestaña Más y Navegación en iOS
- **Feature ID:** i18n-ios-more-navigation
- **Resultado:** COMPLETO y Validado con `xcodebuild` (43 tests de localización en verde, 100% de la suite compila y pasa).
- **Entregables:**
  - `CommonStrings.swift` refactorizado a `public` y ampliado con 23 propiedades de traducción para tabs, headers y menús.
  - `Route.swift` (Tab y SidebarSection), `CompactTabLayout.swift`, `SidebarSplitLayout.swift` e `MoreMenuView.swift` migrados a resolución dinámica.
  - `Localizable.xcstrings` actualizado con las nuevas claves correspondientes.
  - `CommonLocalizationTests.swift` extendido con pruebas dinámicas completas de cambio de idioma.

## Sesión 2026-06-02: Internacionalización Dinámica de Meses y Calendario en iOS
- **Feature ID:** i18n-ios-calendar-dynamic-months
- **Resultado:** COMPLETO y Validado con `./init.sh` e `xcodebuild` (Tests de localización de Calendar en verde al 100%, 1229 tests globales en verde).
- **Entregables:**
  - `CalendarViewModel.swift`: Refactorizado `monthFormatter` y `selectedDateFormatter` a variables estáticas dinámicas computadas que consumen `FeatureL10n.locale` en tiempo de ejecución.
  - `CalendarViewModel.swift`: Refactorizada la propiedad computada `monthTitle` para capitalizar únicamente el primer carácter del string formateado (`prefix(1).uppercased() + dropFirst()`), produciendo `"Marzo de 2026"` en español y `"March 2026"` en inglés de manera natural y estéticamente correcta.
  - `CalendarLocalizationTests.swift`: Corregidas firmas de propiedades y adaptadas las aserciones para validar la traducción dinámica y la capitalización de nombres de meses en español e inglés.

## Sesión 2026-06-02: Robustecimiento de Contrato OpenAPI en Backend
- **Feature ID:** 15 (backend-pii-log-protection) / 432 (openapi-harden)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1229 tests en verde, 100% de la suite de contrato en verde).
- **Entregables:**
  - `contract_test.go` actualizado con la suite `TestOpenAPISpec_PublicRoutesContract` que valida rutas públicas, schemas, body shapes y operationIds.
  - `feature_list.json` actualizado documentando la feature como `done`.
  - Proceso de SDD formalmente ejecutado y archivado en Engram.

## Sesión 2026-06-02: Observabilidad de Flujos de Pagos Públicos en Backend
- **Feature ID:** 16 (backend-public-payments-observability) / 430 (public-payments-observability)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1229 tests globales en verde, 100% de la suite de handlers en verde).
- **Entregables:**
  - `event_public_link_handler.go`: Logs estructurados de solicitud y verificación de portal público con truncado seguro de tokens públicos.
  - `payment_submission_handler.go`: Logs de submissions de pagos (sanitizando filepaths con `filepath.Base`) y de inicio/finalización de reviews.
  - `upload_handler.go`: Logs de finalización de uploads presignados protegiendo rutas S3 relativas.
  - `subscription_handler.go`: Logs de recepción y validación de firma en webhooks de Stripe.
  - `feature_list.json` actualizado registrando la feature como `done`.
  - SDD formalmente ejecutado, validado y archivado en Engram.



## Sesión 2026-06-02: Menú Contextual de Acciones en Administración de Usuarios
- **Feature ID:** admin-users-actions-dropdown (SDD hybrid)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1229 tests en verde).
- **Entregables:**
  - `AdminUsers.tsx` (Migración de botones de acción inline a componente reutilizable de dropdown contextual `RowActionMenu`)
  - `AdminUsers.test.tsx` (Actualización y adaptación de suite de tests unitarios de interacciones del panel de admin)
  - `openspec/specs/admin-ui/spec.md` (Inauguración de especificación central de UI de Administración)

## Sesión 2026-06-02: Bloqueo de Usuario con Motivo en Administración de Usuarios
- **Feature ID:** 18 (admin-block-user)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1230 tests en verde).
- **Entregables:**
  - `adminService.ts` (Implementación de método blockUser para llamar al endpoint PUT del backend)
  - `useAdminQueries.ts` (Implementación de hook mutation useBlockUser)
  - `AdminUsers.tsx` (Acción Bloquear en RowActionMenu y modal interactivo de bloqueo con textarea obligatorio)
  - `AdminUsers.test.tsx` (Tests de flujo de bloqueo: validación, cancelación y éxito)
  - `docs/PRD/11_CURRENT_STATUS.md` (Documentación actualizada del estado del feature y del endpoint de bloqueo)

## Sesión 2026-06-03: Pantalla de Detalle de Usuario con Métricas y Timeline
- **Feature ID:** 19 (admin-user-details)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1233 tests en verde).
- **Entregables:**
  - `AdminUserDetails.tsx` (Componente de vista de detalles de usuario con métricas de adopción e i18n completo)
  - `AdminUserDetails.test.tsx` (Pruebas unitarias de carga de información de usuario, métricas y timeline sin PII en verde)
  - `es/admin.json` y `en/admin.json` (Claves de traducción agregadas para el módulo de detalles)

## Sesión 2026-06-08: Corrección de Crash en Navegación de Eventos en Android
- **Feature ID:** android-event-form-crash-fix
- **Resultado:** COMPLETO y Validado con `./init.sh` (1233 tests en verde) y tests unitarios de Android.
- **Entregables:**
  - `CompactBottomNavLayout.kt` (Ruta `event_form` ampliada para soportar los parámetros query opcionales `eventId` y `date`)
  - `EventFormViewModel.kt` (Pre-poblado de fecha si no viene un `eventId` pero sí un parámetro `date`)
  - `EventFormViewModelTest.kt` (Prueba unitaria que valida el comportamiento del `SavedStateHandle`)

## Sesión 2026-06-08: Corrección de Acción de Edición en Menú Contextual de Eventos en Android
- **Feature ID:** android-event-list-edit-fix
- **Resultado:** COMPLETO y Validado con `./init.sh` (1233 tests en verde) y tests de Android.
- **Entregables:**
  - `CompactBottomNavLayout.kt` (Se pasa la callback `onEventEdit = { id -> navController.navigate("event_form?eventId=$id") }` a `EventListScreen` en el NavHost para evitar que use el fallback de detalles por defecto)

## Sesión 2026-06-08: Menú Contextual de Clientes en Android
- **Feature ID:** android-client-contextual-menu
- **Resultado:** COMPLETO y Validado con `./init.sh` (1233 tests en verde), compilación de Kotlin y tests de Android unitarios al 100% en verde.
- **Entregables:**
  - `ClientListScreen.kt` (Soporte para long-press en los items, integración de la bottom sheet, y parámetro `onLongClick` opcional/anulable en `ClientListItem`)
  - `ClientListActionSheets.kt` (Menú contextual de opciones rápidas: Editar, Llamar, Correo y Eliminar con su diálogo de confirmación y flujo de borrado)
  - `ClientListViewModel.kt` (Acciones de borrado lógico y manejo de mensajes de error de límites de plan)
  - `CompactBottomNavLayout.kt` (Callback `onClientEdit` enrutado al formulario del cliente)
  - `strings.xml` y `values-en/strings.xml` (Textos traducidos en ES y EN para las acciones del menú contextual)

## Sesión 2026-06-08: Menú Contextual de Personal y Equipos en Android
- **Feature ID:** android-staff-team-contextual-menu
- **Resultado:** COMPLETO y Validado con `./init.sh` (1233 tests en verde), compilación de Kotlin y tests de Android unitarios al 100% en verde.
- **Entregables:**
  - `StaffListScreen.kt` (Soporte para long-press en colaboradores, integración de bottom sheet y diálogo de eliminación)
  - `StaffTeamListScreen.kt` (Soporte para long-press en equipos, eliminación del botón directo de borrado del card y enlace con la confirmación de eliminación)
  - `StaffListActionSheets.kt` (Bottom sheets de acciones contextuales para colaboradores y equipos)
  - `StaffListViewModel.kt` (Implementación de `deleteStaff` y control de error de eliminación)
  - `CompactBottomNavLayout.kt` (Callbacks `onStaffEdit` y `onTeamEdit` enrutados a sus correspondientes formularios)
  - `strings.xml` y `values-en/strings.xml` (Textos traducidos en ES y EN para las acciones rápidas del menú)
 
## Sesión 2026-06-08: Corrección de Padding de Teclado en Formularios de Android
- **Feature ID:** android-keyboard-padding-fix
- **Resultado:** COMPLETO y Validado con `./init.sh` (1233 tests en verde), compilación de Kotlin y tests de Android unitarios en verde.
- **Entregables:**
  - `CompactBottomNavLayout.kt` (Se condicionó el render de `NavigationBar` a `isAtTopLevel` en la navegación compacta, eliminando el padding inferior fantasma en pantallas secundarias)
  - `ProductFormScreen.kt`, `InventoryFormScreen.kt`, `StaffFormScreen.kt`, `StaffTeamFormScreen.kt`, `ClientFormScreen.kt` (Migrados de insets anidados `.navigationBarsPadding().imePadding()` a la directiva dinámica `.windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom))`)
 
## Sesión 2026-06-08: Versión y Changelog para Play Store (Android 1.3.1)
- **Feature ID:** android-version-bump-1-3-1
- **Resultado:** COMPLETO y Validado con `npm run version:ci` y `./init.sh`.
- **Entregables:**
  - `build.gradle.kts` (Versión de Android actualizada a versionName 1.3.1 y versionCode 9)
  - `releases.json` (Registro oficial de la versión 1.3.1 con los menús contextuales y fixes en el manifest de releases)
  - `CHANGELOG.md` y `changelog.generated.ts` (Archivos autogenerados y sincronizados correctamente)
