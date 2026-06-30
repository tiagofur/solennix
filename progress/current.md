# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **ID:** web-event-form-blocked-dates
- **Nombre:** Web event form blocked dates picker (cross-platform parity de iOS #699 / Android #696)
- **Estado:** done (ready for verify)
- **Rama:** `feat/web-event-form-blocked-dates`
- **Estrategia:** single-pr + `size:exception` (maintainer-approved; ~350 net lines, ~60% mechanical moves)

## Plan de trabajo (SDD apply T1→T8)
- [x] T1 — DRY extract `parseLocalDate` → `lib/dateUtils.ts` (+ `localToday`, Fix 3 doc)
- [x] T2 — NEW `lib/blockedDates.ts` (`buildBlockedDateList`, `isDateBlocked`); EventList delega
- [x] T3 — Shared `components/dayPickerStyles.tsx` (rdp theming byte-identical); EventList renderiza `{dayPickerStyles}`
- [x] T4 — NEW `components/EventDatePicker.tsx` (disable-select native `disabled`, `.rdp-unavailable`, sin dots)
- [x] T5 — `EventForm.tsx`: TZ-safe default (`localToday`) + auto-skip effect data-ready-gated (Fix 1) + helper `advancePastBlockedDate` puro; save guard intacto
- [x] T6 — Wire `EventDatePicker` en `EventGeneralInfo.tsx` (grupo label `aria-labelledby`); rama muerta de warning eliminada
- [x] T7 — Playwright `tests/e2e/event-form.spec.ts` (disable-select, auto-skip, save-guard ES+EN)
- [x] T8 — `./init.sh` en verde (0); lint 0 errores; 1298 tests Vitest pasan; sin logs huérfanos

## Notas de Desarrollo
- **Web ADR-1**: seam único local-midnight para el picker; `parseEventDate` (LOCAL-noon) confinado al save-guard. helpersAgree.test.ts (REQ-6) pinnea el acuerdo.
- **Fix 1**: data-ready gate (`if (!unavailableDates?.length) return`) ANTES del latch del ref → el auto-skip dispara tras resolver react-query (no en el render vacío `[]`).
- **Fix 2**: react-day-picker v10 emite `disabled` NATIVO (no `aria-disabled`) para días bloqueados — asserted en `EventDatePicker.test.tsx`.
- **Fix 3**: `parseEventDate` = LOCAL-noon (ES2016, sin sufijo `Z`); pin test + warning anti-regresión.
- **Desviación de tasks (#3110)**: las rutas de 2 de las 4 copias inline de `parseLocalDate` diferían (`Calendar/components/UnavailableDatesModal.tsx`, `TeamMember/TeamCalendarPage.tsx`); se usaron las rutas reales. Además `advancePastBlockedDate` se extrajo como helper PURO en `lib/blockedDates.ts` (no solo en el effect) para tests TZ deterministas (Node cachea la TZ).
- Commits: `8603ab6c` (T1), `aedcaad5` (T2), `7624e993` (T3), `a95ea8f2` (T4), `792fbe92` (T5), `aa855d5c` (T6), `a91882b0` (T7), `02c664dc` (lint hygiene).

## Bloqueos
- Ninguno. Listo para `verify`. Los tests e2e (T7) skippean limpio sin backend (convención del proyecto); ejecución completa requiere backend vivo.
