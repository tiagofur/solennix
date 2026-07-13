# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #812 — fix(ios): Dashboard disabled new-event button lacks pricing upgrade path
- **Estado:** done (pendiente merge PR #976)
- **Branch:** `fix/ios-dashboard-upgrade-path-812`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-812`

## Root cause
3 entrypoints del Dashboard renderizaban "Nuevo evento" como inert (`.disabled()` o sin NavigationLink) cuando el user estaba al plan limit. EventListView ya ruteara a `Route.pricing` en el mismo scenario — inconsistencia cross-screen.

## Cambios
- [x] `DashboardView.swift` (3 edits):
  - **Toolbar Menu** (línea 129-131): removido `.disabled(!canCreateEvent)`. NavigationLink ahora ruteara a `canCreateEvent ? Route.eventForm() : Route.pricing`.
  - **`quickActionItem` helper** (línea 292-304): siempre renderiza NavigationLink. Cuando `isAtLimit`, ruteara a `Route.pricing`. Opacity 0.6 preserva el affordance visual. Parámetro `enabled: Bool` → `isAtLimit: Bool`.
  - **4 call sites** (iPad grid + iPhone HStack × event/client): actualizados al nuevo signature con `isAtLimit: !canCreateEvent` / `!canCreateClient`. "Nuevo cliente" también ruteara a pricing al limit (DRY).

## Verificación
- `SolennixFeatures` (xcodebuild test): 158/158
- `SolennixTests` (xcodebuild test): 482/482 (1 skipped preexistente)
- `./init.sh`: verde (Go + Web)

## Notas
- El `planLimitsBanner` existente (que ya tiene `NavigationLink(value: Route.pricing)`) NO se tocó — funciona como upgrade path secundario.
- El color muted (gris) del botón cuando está al limit se preserva como affordance visual — solo el routing cambió.
- Paridad: este fix alinea Dashboard con EventListView, que ya usaba `Route.pricing` en el toolbar menu.

## Bloqueos
- Ninguno.
