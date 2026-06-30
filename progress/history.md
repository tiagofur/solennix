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

## Sesión 2026-06-13: Refactorización y Homogeneidad en Formulario de Cliente en iOS
- **Feature ID:** ios-client-form-styling
- **Resultado:** COMPLETO y Validado con `./init.sh` (1239 tests en verde) y Día de Juicio (Ronda 2) aprobado.
- **Entregables:**
  - `ClientFormView.swift` (Reemplazado `Form` con `ScrollView` y estructuradas las secciones en tarjetas `SolennixColors.card`, corrigiendo dobles fondos)
  - `ClientFormView.swift` (Removida etiqueta interna redundante de "Notas" en el editor de notas)
  - `ClientFormView.swift` (Ajustado el relleno principal a `.padding(Spacing.lg)` para alinear con `ProductFormView.swift`)
  - `ProductDetailView.swift` (Refactorizado el contenedor horizontal de KPIs de un HStack a un LazyVGrid de 2 columnas, previniendo el apiñamiento e hipenación de texto en móviles)
  - `PaymentInboxView.swift` (Modificado `iPhoneListContent` para renderizar estados vacíos/bloqueados/errores condicionalmente fuera del contenedor `List`, permitiendo un centrado vertical en pantalla completa)

## Sesión 2026-06-13: Auditoría y Correcciones de Estilo y Localización en Pantallas de Ajustes en iOS
- **Feature ID:** ios-settings-audit
- **Resultado:** COMPLETO y Validado con `./init.sh` (1239 tests en verde), `xcodebuild test` (412 tests de iOS en verde) y Día de Juicio (Ronda 2) aprobado por jueces ciegos con `VERDICT: CLEAN`.
- **Entregables:**
  - `ReviewsView.swift` (Corregido doble fondo reemplazando `.textFieldStyle(.roundedBorder)` por `.textFieldStyle(.plain)` y fondo del tema de tokens)
  - `PricingView.swift` (Localizadas etiquetas de planes, características, fallas inesperadas de compras y enlaces legales)
  - `ContractDefaultsView.swift` (Localizadas variables estáticas del contrato y etiquetas dinámicas del picker; aplicados fondos de tarjeta a secciones)
  - `AboutView.swift` (Localizadas etiquetas estáticas y enlaces a redes sociales)
  - `BusinessSettingsView.swift`, `EditProfileView.swift`, `ChangePasswordView.swift`, `NotificationPreferencesView.swift` (Homogeneizado estilo visual con tarjetas usando `.listRowBackground(SolennixColors.card)` en todas sus secciones)
  - `SettingsView.swift` (Removidos los enlaces de navegación redundantes hacia "Reseñas" en Ajustes)
  - `EditProfileView.swift` (Deshabilitado el campo de Correo Electrónico agregando `.disabled(true)` para hacer el campo de lectura únicamente y prevenir modificaciones en el identificador del usuario)

## Sesión 2026-06-20: Revisión de Calidad, Compilación y Android Lint para la Play Store (Día de Juicio)
- **Feature ID:** android-playstore-ready
- **Resultado:** COMPLETO y Validado con `./gradlew lint` (0 errores) y `./gradlew test` (100% verde), y validación de arnés `./init.sh` en verde.
- **Entregables:**
  - `SubscriptionScreen.kt` (Añadido suppressions de lint para `LocalContextGetResourceValueCall`, `NonObservableLocale` y `LocalContextConfigurationRead`)
  - `EventFormGeneralInfoStep.kt` (Solucionado error de `NewApi` reemplazando `DateTimeFormatter.localizedBy` por `withLocale` y utilizando el LocalConfiguration de compose para lectura no bloqueante de locales)
  - `CalendarScreen.kt`, `DashboardScreen.kt`, `QuickQuoteScreen.kt`, `EventDetailContractPreviewScreen.kt`, `EventFormStaffPickers.kt`, `EventListScreen.kt`, `PhotoGallerySheet.kt`, `EventListFiltersSection.kt` (Corregidos Compose resource warnings y locale warnings mediante suppressions del compilador de lint)
  - `Avatar.kt`, `UpgradeBanner.kt`, `CalendarScreen.kt` (Corregido orden de parámetros de Compose situando `modifier` como primer parámetro opcional)
  - `HapticFeedback.kt` y `NetworkMonitor.kt` (Corregido warning de permisos faltantes con `@SuppressLint("MissingPermission")` al usarse en contextos controlados)
  - `AndroidManifest.xml` (Añadido permiso `<uses-permission android:name="android.permission.VIBRATE" />` necesario para las respuesta háptica)

## Sesión 2026-06-20: Limpieza de deuda técnica menor en Frontend Web (Issue #518)
- **Feature ID:** web-low-severity-cleanups
- **Resultado:** COMPLETO y Validado con `./init.sh` (1239 tests de Vitest en verde).
- **Entregables:**
  - `useAdminQueries.ts` e `es/admin.json` / `en/admin.json` (Localizados los mensajes de toast de administración al eliminar, verificar o bloquear usuarios)
  - `useStaffQueries.ts` e `es/staff.json` / `en/staff.json` (Localizado el toast de error al marcar el timeline de colaborador como leído)
  - `ClientPortalPage.tsx` e `es/public.json` / `en/public.json` (Localizadas las validaciones de carga de archivos en el portal de cliente)
  - `ProductForm.tsx` (Filtradas las filas de ingredientes de recetas con `inventory_id: ""` antes de ser enviadas a la API)
  - `EventFormLinksPage.tsx` (Reemplazado el uso de `window.confirm` nativo por el componente de diseño `ConfirmDialog`)
  - `lib/firebase.ts` (Eliminado archivo redundante/muerto de Firebase que causaba fallas en las inicializaciones)

## Sesión 2026-06-21: Filtro de Ámbito en Inventario en Web (Issue #551)
- **Feature ID:** 551
- **Resultado:** COMPLETO y Validado con `./init.sh` (1242 tests de Vitest en verde).
- **Entregables:**
  - `web/src/pages/Inventory/InventoryList.tsx` (Filtro de ámbito client-side de consumibles, insumos y equipos con tabs interactivas)
  - `web/src/pages/Inventory/InventoryList.test.tsx` (Tests de Vitest para renderizado, filtrado por tabs y estados vacíos específicos)
  - `web/src/i18n/locales/es/inventory.json` / `web/src/i18n/locales/en/inventory.json` (Claves de traducción para filtros de ámbito y sus estados vacíos en español e inglés)







## Sesión 2026-06-21: Redirección desde Top Clientes en el Dashboard
- **Feature ID:** 23 (dashboard-top-clients-navigation)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1246 tests en verde).
- **Entregables:**
  - `web/src/components/TopClientsWidget.tsx` (Enrutado al detalle del cliente usando `useNavigate`)
  - `web/src/components/TopClientsWidget.test.tsx` (Nuevas pruebas unitarias para interactividad de clics)
  - `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Dashboard/Views/TopClientsWidgetView.swift` (Envolver ítems de clientes en NavigationLink)
  - `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/TopClientsWidget.kt` (Añadir callback clickable en ítems de clientes)
  - `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt` (Pasar listener de navegación al widget)
  - `android/app/src/main/java/com/creapolis/solennix/ui/navigation/CompactBottomNavLayout.kt` (Enrutar callback de navegación a client_detail/{id})

## Sesión 2026-06-22: Redirección desde Demanda de Productos en el Dashboard
- **Feature ID:** 24 (dashboard-product-demand-navigation)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1250 tests en verde).
- **Entregables:**
  - `web/src/components/ProductDemandWidget.tsx` (Enrutado al detalle del producto usando `useNavigate`)
  - `web/src/components/ProductDemandWidget.test.tsx` (Nuevas pruebas unitarias para interactividad de clics)
  - `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Dashboard/Views/ProductDemandWidgetView.swift` (Envolver ítems de productos en NavigationLink con PlainButtonStyle)
  - `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/ProductDemandWidget.kt` (Añadir callback clickable en ítems de productos)
  - `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt` (Pasar listener de navegación al widget)
  - `android/app/src/main/java/com/creapolis/solennix/ui/navigation/CompactBottomNavLayout.kt` (Enrutar callback de navegación a product_detail/{id})

## Sesión 2026-06-22: Estilo de Lista Plana y Divisores en Widgets del Dashboard
- **Feature ID:** 578 (dashboard-flat-list-dividers)
- **Resultado:** COMPLETO y Validado (PR #579 abierto).
- **Entregables:**
  - Web: `TopClientsWidget.tsx` y `ProductDemandWidget.tsx` (Migración a divide-y con divide-border y rows full-bleed)
  - iOS: `TopClientsWidgetView.swift` y `ProductDemandWidgetView.swift` (Estructurados con VStack y Divider, chevron.right trailing icon, primary color amount)
  - Android: `TopClientsWidget.kt` y `ProductDemandWidget.kt` (Refactorizados con forEachIndexed + HorizontalDivider, KeyboardArrowRight trailing icon)

## Sesión 2026-06-22: Corrección y Auditoría del Sistema de Caché en Android
- **Feature ID:** android-cache-sync-fixes
- **Resultado:** COMPLETO y Validado con `./init.sh` (1250 tests en verde).
- **Entregables:**
  - `ClientFormViewModel.kt` (Inyectado syncClients() antes de getClient() con fallback silencioso offline para prevenir PUTs con campos obligatorios vacíos y error 400)
  - `InventoryFormViewModel.kt` (Inyectado syncInventory() antes de getInventoryItem() con fallback silencioso offline)
  - `InventoryDetailViewModel.kt` (Inyectado syncInventory() antes de getInventoryItem() para asegurar información fresca en detalle de inventario)
  - `cache_audit.md` (Documentación completa de la auditoría de caché local en ViewModels de Android)

## Sesión 2026-06-22: Corrección de Pronóstico en iOS y Alineación de Próximos Eventos
- **Feature ID:** 25 (dashboard-metrics-loading)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1250 tests en verde) y `xcodebuild test` (7/7 tests de DashboardMetrics en verde).
- **Entregables:**
  - `ForecastDataPoint.swift` (Renombrada propiedad `confirmedEventCount` a `confirmedEvents` para alineación directa con la clave JSON `"confirmed_events"` del backend)
  - `ForecastWidgetView.swift` (Actualizadas todas las referencias a `confirmedEvents` en la vista y en los mocks de previsualización)
  - `DashboardMetricsModelsTests.swift` (Actualizado el payload mock a `"confirmed_events"` y corregidas las aserciones de pruebas)
  - `EventDao.kt` (Actualizadas las queries de Room `getUpcomingEvents` en Android para filtrar por `status = 'confirmed'`, logrando paridad lógica con iOS y Web)

## Sesión 2026-06-22: Corrección de Carga de Próximos Eventos en Dashboard iOS
- **Feature ID:** 26 (ios-upcoming-events-api-fix)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1250 tests en verde) y `xcodebuild test` (413/413 tests de iOS en verde).
- **Entregables:**
  - `DashboardViewModel.swift` (Refactorizado `loadDashboard()` para invocar directamente a `Endpoint.upcomingEvents` y asignar de manera directa los eventos próximos ordenados, evitando la limitación de paginación del listado general).





## Sesión 2026-06-22: Sincronización del Dashboard de Android con iOS
- **Feature ID:** android-dashboard-alignment
- **Resultado:** COMPLETO y Validado con `./init.sh` (1250 tests en verde), pruebas de feature compiladas y pasadas, y rebuild exitoso e instalado en el emulador Android running.
- **Entregables:**
  - `EventDao.kt` (Corregido bug de consulta en `getUpcomingEvents` filtrando por `status = 'CONFIRMED'` en mayúsculas, restaurando la visibilidad de la sección de Próximos eventos)
  - `strings.xml` (Español / Inglés) (Renombrado a Pronóstico y añadidas cadenas de paridad)
  - `ForecastWidget.kt` (Rediseñado el widget con tarjetas de resumen side-by-side e ítems de tarjetas mensuales compactas sin íconos decorativos y con formato exacto al de iOS)

## Sesión 2026-06-27: Unificación de Calendario y Lista de Eventos en Web
- **Feature ID:** 28 (web-calendar-event-list-unification)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1250 tests de Vitest en verde).
- **Entregables:**
  - `web/src/pages/Events/EventList.tsx`: Integración del mini-calendario interactivo en la sección superior y listado detallado debajo, con controles para cambiar de fecha y filtrar.
  - `web/src/pages/Events/EventList.test.tsx`: Suite de pruebas unitarias actualizada para cubrir la selección de fechas en el calendario y las interacciones del modal de bloqueo de fechas.
  - `web/src/pages/Calendar/CalendarView.tsx` y `CalendarView.test.tsx`: Eliminados para mantener el repositorio limpio y evitar archivos huérfanos.
  - `web/src/App.tsx` y `web/src/components/BottomTabBar.tsx`: Rutas actualizadas redirigiendo `/calendar` a `/events`.
  - `web/src/components/Layout.tsx` y `web/src/components/Layout.test.tsx`: Actualizado el enrutado de la barra lateral para alineación.

## Sesión 2026-06-28: Redireccionamientos y Paridad de Filtros de Calendario en Web
- **Feature ID:** 28 (web-calendar-event-list-unification) — Extensión y Limpieza final
- **Resultado:** COMPLETO y Validado con `./init.sh` (1234 tests en verde).
- **Entregables:**
  - `web/src/hooks/useKeyboardShortcuts.ts` y `.test.ts`: Actualizados los atajos globales de `g k` a `/events?view=calendar`.
  - `web/src/components/CommandPalette.tsx`: Redirección directa del Calendario a `/events?view=calendar`.
  - `web/src/pages/Dashboard.tsx`: Enlaces del Dashboard (alertas y próximos eventos) actualizados a `/events?view=calendar`.
  - `web/src/pages/Events/EventForm.tsx` y `.test.tsx`: El botón de retorno ahora navega a `/events?view=calendar`.
  - `web/src/pages/Events/EventList.tsx` y `.test.tsx`: Limpieza completa y adición de pruebas unitarias para segmented control, period chips y view parameter en URL.
  - `feature_list.json`: Criterios de aceptación detallados y actualizados.
## Sesión 2026-06-28: Rediseño Premium de la Interfaz Web (Liquid Glass & macOS Style)
- **Feature ID:** web-liquid-glass-redesign (Issue #642)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1234 tests en verde), PR #643 integrada exitosamente.
- **Entregables:**
  - `web/src/components/Input.tsx`: Corrección de desestructuración del `id` para evitar IDs desalineados en labels y inputs.
  - `web/src/pages/Clients/`: `ClientList.tsx`, `ClientDetails.tsx`, `ClientForm.tsx` refactorizados con cards glass premium y layouts responsivos de alta fidelidad.
  - `web/src/pages/Products/`: `ProductList.tsx`, `ProductDetails.tsx`, `ProductForm.tsx` migrados a contenedores y inputs estandarizados.
  - `web/src/pages/Inventory/`: `InventoryList.tsx`, `InventoryForm.tsx` rediseñados con estética Liquid Glass.
  - `web/src/pages/Settings.tsx`: Nuevo diseño de doble columna estilo macOS System Settings con sidebar de navegación y cards de contenido glass.

## Sesión 2026-06-28: Ajustes en Menú Lateral y Filtros de Calendario en Web
- **Feature ID:** web-sidebar-overlap-and-event-filters (Issue #644)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1235 tests in verde), PR #645 integrada exitosamente.
- **Entregables:**
  - `web/src/pages/Events/EventList.tsx` y `.test.tsx`: Ocultados los chips de filtro de periodo (`Hoy`, `Semana`, `Mes`, `Personalizado`) en la vista de calendario y asegurado el borrado de estos query params al alternar a la vista de calendario.
  - `web/src/components/Layout.tsx` y `.test.tsx`: Modificada la posición del aside en desktop de `lg:static` a `lg:relative lg:z-20` para evitar que el contenido con scroll se superponga sobre el menú, ajustado el padding horizontal a `lg:px-2.5` al estar colapsado, ampliado el tamaño de los iconos a `lg:w-12 lg:h-12` (48px) y centrado el botón de cerrar sesión con la misma dimensión cuadrada.

## Sesión 2026-06-29: Métricas de Plataforma (Registro y Uso Activo) en Admin Dashboard
- **Feature ID:** 29 (platform-metrics-analytics)
- **Resultado:** COMPLETO y Validado con `./init.sh` (1236 tests de Vitest en verde, tests unitarios y de integración de backend en verde, y typecheck del front en verde).
- **Entregables:**
  - `060_add_user_platform_metrics.up.sql` / `.down.sql` (Migración de DB agregando `users.registration_platform` e infiriendo retroactivamente la plataforma desde `device_tokens`, y creando `user_platforms`)
  - `models.go` (Agregados campos `RegistrationPlatform` y `UserPlatform` para mapeo de datos)
  - `user_repo.go` (SQL Scans actualizados para soportar `registration_platform`, implementación de `UpsertUserPlatforms` e implementación de `UpdateRegistrationPlatform` para actualizaciones retroactivas)
  - `admin_repo.go` (Consultas optimizadas sin N+1 para obtener `RegistrationsByPlatform`, `ActiveUsersByPlatform`, `InteractionsByPlatform` e historial individual de plataformas de usuario)
  - `auth.go` (Middleware `ActivityTracker` con buffer en RAM thread-safe, exclusión de administradores de las estadísticas, autoregistro retroactivo asíncrono para usuarios existentes en su siguiente petición, y caché `userCache` en memoria para evitar consultas redundantes de base de datos)
  - `auth_test.go` (Suite completa de pruebas unitarias cubriendo parseos de UA, concurrencia, flushing, caché, exclusión de rol "admin" e inicio retroactivo asíncrono)
  - `admin_handler_test.go` (Pruebas unitarias de serialización del endpoint del handler de admin)
  - `adminService.ts` (Modelos y llamadas de endpoints del front actualizados para metrics)
  - `AdminDashboard.tsx` (Renglón de gráficos de plataforma Recharts: Registros, MAU e Intensidad de Uso)
  - `AdminUsers.tsx` (Mini-badges de registro y plataformas activas con títulos)
  - `AdminUserDetails.tsx` (Muestra de plataforma de registro y grid de interacciones/fechas de último uso por plataforma)

## Sesión 2026-06-30: Paridad de Idioma Automático de Sistema en Android
- **Feature ID:** 30 (android-system-language)
- **Resultado:** COMPLETO y Validado con `./init.sh` y `./gradlew testDebugUnitTest` (506/506 tareas en verde, todos los tests de Android, Backend y React en verde).
- **Entregables:**
  - `LanguageReporter.kt`: Nueva clase utilitaria e interfaz de persistencia en `:core:data` que maneja el throttling de reportes del idioma del sistema (`es` o `en`) al backend (`preferred_language` / `UPDATE_PROFILE`), idéntico a iOS.
  - `DataModule.kt`: Registro del binding de Hilt para `LanguageReportStoring`.
  - `SettingsRepository.kt` & `SettingsRepositoryImpl.kt`: Eliminación de `appLanguage` y `setAppLanguage`, y agregado de un bloque `init` para limpiar la clave heredada `app_language` del DataStore.
  - `SettingsViewModel.kt` & `SettingsScreen.kt`: Eliminación de la opción visual de idioma, diálogos y estados locales de selección de idioma en tablet y móvil.
  - `MainActivity.kt`: Inyección de `LanguageReporter`, restablecimiento de overrides in-app llamando a `AppLocaleManager.applyLanguage(this, "")` en `onCreate`, y observación de `authState` para sincronizar automáticamente el idioma del sistema con el servidor en la autenticación.
  - `LanguageReporterTest.kt`: Pruebas unitarias de MockK completas que garantizan el correcto funcionamiento del throttling y la resiliencia ante errores de red.
  - `SettingsViewModelTest.kt`: Eliminados tests unitarios obsoletos relacionados con el selector de idioma manual.
