# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #855 — feat(android): Widget text respects system font scaling
- **Estado:** PR #1016 abierto, CI verde, esperando merge.
- **Branch:** `fix/855-widget-font-scaling`

## Resumen
- `WidgetScaledText` helper: `scaledFontSize(base, fontScale)` con cap `MAX_FONT_SCALE=1.3f` (paridad iOS `cappedRevenueFontSize`).
- `rememberScaledSp(base)` lee `fontScale` de `LocalContext` (Glance sin `LocalDensity`).
- Aplicado a KpiWidget, UpcomingEventsWidget, QuickActionsWidget, WidgetStateView.
- `maxLines=1` en KPI card value/label para evitar clipping de valores largos (`$125.0k`).
- 5 tests en `WidgetScaledTextTest` (default, proporcional, cap, paridad iOS, shrink).

## Últimas sesiones cerradas
- #855 feat(android): widget font scaling — PR #1016 abierto, CI verde.
- #902 fix(backend): i18n writePlanLimitError + dashboard errors — PR #1012 merged.
- #904 feat(backend): start_date/end_date aliases en GET /events — PR #1013 merged.
- #890 epic security hardening — cerrado (18 sub-issues backend + 9 deps client-side todos CLOSED).
- #1014 fix(backend): staff handler i18n (71 strings) — PR #1015 merged.

## Bloqueos
- Ninguno.
