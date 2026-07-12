# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #815 — fix(ios): Deep link tokens lack client-side format validation
- **Estado:** done (pendiente merge PR #954)
- **Branch:** `fix/ios-deeplink-token-validation-815`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-815`
- **Issue:** #828 — fix(android): Widget monthly revenue diverges from dashboard netSalesThisMonth
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-widget-monthly-revenue-divergence-828`

## Root cause
El widget "Este mes" sumaba `COMPLETED` event `totalAmount` client-side (excluía `CONFIRMED`, sin conciencia de descuentos/impuestos). El dashboard usa `netSalesThisMonth` del backend (`/dashboard/summary`), que scopea confirmed+completed y es tax/discount-aware. Widget y dashboard mostraban valores distintos.

## Cambios
- **`WidgetKpiSnapshot`** (`:core:model`): DTO con `netSalesThisMonth`, `eventsThisMonth`, `updatedAt` — el snapshot server-authoritative que el widget prefiere.
- **`WidgetKpiStore`** (`:widget`): lee/escribe el snapshot en el mismo `EncryptedSharedPreferences` compartido app↔widget (mismo UID). `read()`/`write()`/`clear()` best-effort.
- **`WidgetSyncTrigger`** (`:core:data`): extendido con `saveKpiSnapshot(kpis)` + `clearKpiSnapshot()`.
- **`WidgetSyncCoordinator`** (`:app`): impl que persiste el snapshot vía `WidgetKpiStore` y luego refresca widgets.
- **`DashboardViewModelSync.refresh()`**: tras `getSummary()` exitoso, llama `widgetSyncTrigger.saveKpiSnapshot(summary.kpis)`.
- **`SettingsViewModel.logout()`**: llama `widgetSyncTrigger.clearKpiSnapshot()` antes del refresh.
- **`KpiCalculator.deriveMonthlyRevenue()`**: fallback client-side corregido — confirmed+completed (no solo completed), scoped al mes calendario real vía `YearMonth`. Usado solo cuando no hay snapshot (cold launch antes del primer fetch del dashboard).
- **`KpiWidget`**: lee `WidgetKpiStore.read(context)`; prefiere `snapshot.netSalesThisMonth`, fallback a `deriveMonthlyRevenue(events)`. También corregido el upcoming count para usar `parseFlexibleDate` en vez de naive string compare.

## Verificación
- `:widget:testDebugUnitTest`: verde (+5 tests nuevos de `deriveMonthlyRevenue`)
- `:app:testDebugUnitTest`: verde (coordinator test actualizado con nuevo `appContext` param)
- `:feature:{dashboard,settings}:testDebugUnitTest`: verde
- `assembleDebug`: APK generado OK
- `./init.sh`: verde (entorno completo)

## Notas
- Patrón "server-authoritative override" (igual que iOS PR #921): el dashboard ya fetcha `/dashboard/summary` con `netSalesThisMonth`; solo faltaba persistirlo para que el widget lo lea.
- El snapshot vive en `EncryptedSharedPreferences` (mismo archivo que `WidgetAuthProvider` ya lee) — no requiere DataStore nuevo ni una tabla Room adicional.
- El fallback `deriveMonthlyRevenue` replica el scope del backend (`status IN ('confirmed','completed')`, `totalAmount` ya post-descuento) para cold-launch antes del primer fetch. No replica prorrateo VAT (el snapshot del server es la fuente autoritativa para eso).
- #824 (pending payment balance) ya estaba resuelto en PR #913 (commit 79bb1043) — verificado y confirmado antes de pivotar a #828.
- **Issue:** #809 — fix(ios): EventFormViewModel silently sets product cost to 0 on API error
- **Estado:** done (PR #944 — fix CI LoginFlowTests)
- **Branch:** `fix/ios-event-form-cost-on-error-809`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-809`

## Root cause
`EventFormViewModel+Profitability.fetchProductCosts()` y `EventDetailViewModel.loadProductUnitCosts()` seteaban `productUnitCosts[id] = 0` cuando fallaba el fetch de ingredientes. Cero costo → margen inflado artificialmente. Peor: `hasPendingProductCosts` (que dispara el warning naranja "Algunos costos de productos siguen cargando") depende de que el costo sea `nil`, pero el `= 0` lo pisa y el warning **nunca aparece** — el usuario ve rentabilidad falsa sin señal. `QuickQuoteViewModel` ya hacía lo correcto (deja `nil`).

## Cambios
- [x] `EventFormViewModel+Profitability.swift`: removido `productUnitCosts[productId] = 0` del `catch`. Agregado `logger` (`os.log`, subsystem `SolennixLog.subsystem`, category `EventFormProfitability`). En error: `logger.error(...)` + deja `nil` → `hasPendingProductCosts` queda `true` → la UI muestra el warning. Docstring actualizado.
- [x] `EventDetailViewModel.swift`: mismo fix en el `withTaskGroup`. Cambio el tipo del group de `(String, Double)` a `(String, Double)?` para poder retornar `nil` en el `catch` y omitir la asignación. Agregado `logger` (category `EventDetailViewModel`). Docstring corregido (decía "records 0 so the margin stays usable" — ahora documenta el comportamiento correcto).
- [x] Tests `EventFormViewModelProfitabilityTests.swift` (nuevo, en `SolennixFeaturesTests/Events/`): 3 casos — regresión #809 (error deja nil + warning visible), éxito (10*2 + 5*4 = 40, equipment excluido), skip producto cacheado. Patrón: `ProfitabilityMockURLProtocol` + `APIClient(session:)` (copia de `ClientFormViewModelTests`).
- [x] CI fix PR #944: `AuthManager.applyUITestAuthBootstrap()` resuelve auth sincrónicamente en UI tests (evita splash race). `LoginFlowTests` reforzado con `hasSeenOnboarding` seed + `waitForExistence(30s)`.

## Verificación
- `SolennixFeatures` (xcodebuild test): 156/156 (+3 nuevos)
- `Solennix` (xcodebuild test): 469/469 (1 skipped preexistente)
- `./init.sh`: verde (Go + Web 1334/1334)

## Notas
- `ProductIngredient` no tiene init público (es `Codable` sintetizado) → los tests usan JSON raw string + `Data(utf8)` en vez de construir el struct.
- `EventDetailViewModel` usa `withTaskGroup` (paralelo) vs. `EventFormViewModel` usa `for` secuencial — el fix se adaptó a cada patrón (sentinel nil opcional vs. omitir asignación).
- Scope: 2 ViewModels afectados (EventFormVM + EventDetailVM). `QuickQuoteVM` ya correcto, no se tocó.
- Paridad cross-platform NO necesaria: bug de manejo de errores del fetch de costos de iOS.
- **Issue:** #832 — fix(android): Repository sync upsert-only — deleted remote entities persist locally
- **Estado:** done (conflictos de merge con main resueltos, pendiente push)
- **Branch:** `fix/android-sync-orphan-deletion-832`

## Root cause
`DeepLinkHandler.handle()` aceptaba cualquier `token` non-empty para `reset-password` y `team-invite`. El caller (`ContentView.handleDeepLink`) confía ciegamente en el `DeepLinkAction` retornado y lo escribe directo a bindings (`deepLinkResetToken` / `deepLinkTeamInviteToken`) que alimentan `AuthFlowView` → tokens malformados llegaban a la UI antes del reject del server.

## Cambios
- [x] `DeepLinkHandler.swift`: agregados 2 validadores `private static` con `NSRegularExpression` cacheado (patrón de `ContractTemplateTextView.swift:72`):
  - `isValidResetToken` → regex `^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$` (3 segmentos Base64URL, JWT shape — backend `AuthService.GenerateResetToken`, HS256).
  - `isValidTeamInviteToken` → regex `^[0-9a-f]{64}$` (64 hex lowercase — backend `generateFormToken`, `hex.EncodeToString` siempre lowercase; uppercase rechazado para matchear server output).
  - Endurecidos los 2 `guard` en `handle()`: agregada la condición `isValidXToken(token)` además del `!token.isEmpty` existente. Token inválido → `nil` → el caller no-op y la app queda en root (mismo comportamiento que scheme/host incorrecto).
  - Doc comments actualizados documentando los formatos esperados.
- [x] Tests `DeepLinkHandlerTests.swift`:
  - **Actualizados 2 existentes** (sus tokens placeholder rompían con las nuevas reglas): `testHandleResetPasswordWithToken` ahora usa un JWT-shaped string real; `testHandleTeamInviteWithToken` ahora usa 64-char lowercase hex.
  - **Agregados 2 nuevos** de rechazo: `testHandleResetPasswordRejectsNonJWTToken` (no-dots, too many/few segments, invalid chars) y `testHandleTeamInviteRejectsNonHexToken` (non-hex chars, wrong length 32/128, uppercase, 'g' not hex).

## Verificación
- `SolennixTests` (xcodebuild test): 471/471 (+2 nuevos, 1 skipped preexistente)
- `./init.sh`: verde (Go + Web)

## Notas
- El regex valida **shape**, no validez criptográfica — eso es job del server. El cliente solo filtra lo obviamente malformado antes de navegar.
- `event` route NO se tocó: ya valida shape via `parseEventRoute` (segment count + subpaths).
- Spotlight actions (`handleSpotlight`) out of scope: driven por Core Spotlight, no URLs.
- Test data gotcha: `#` es delimiter de fragment en URLs → no llega al query value. Los tests de invalid chars usan `!` + percent-encoding. Y el token hex64 original tenía 63 chars (typo) → corregido a 64.
- Paridad cross-platform NO necesaria: validación client-side de iOS.

## Bloqueos
- Ninguno.
