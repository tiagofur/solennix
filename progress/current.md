# Sesión Activa — Solennix Agent Progress

## Feature en curso
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

## Bloqueos
- Ninguno.
