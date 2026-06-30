# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **ID:** ios-event-form-blocked-dates
- **Nombre:** iOS event form blocked dates picker (cross-platform parity)
- **Estado:** in_progress
- **Rama:** `feat/ios-event-form-blocked-dates`
- **Estrategia:** single-pr + `size:exception` (mantainer-approved ~450 prod lines)

## Plan de trabajo (SDD apply T1→T8)
- [x] T1 — CalendarMonthBuilder helper (DRY, behavior-neutral)
- [x] T2 — EventFormViewModel unavailable-date state + fetch + TZ-safe picker mapping
- [x] T3 — MonthNavigatorView (extract from EventListView)
- [x] T4 — EventFormDatePickerSheet (CalendarGridView host)
- [x] T5 — Step1GeneralView wiring (sheet + inline warning, delete utcEventDateBinding)
- [x] T6 — Save guard (TZ-safe, before network)
- [x] T7 — Localization (2 new xcstrings keys ES/EN)
- [x] T8 — Tests (CalendarMonthBuilderTests + EventFormViewModelUnavailableDateTests; UTC+5 pinned)

## Notas de Desarrollo
- `xcodebuild test -project ios/Solennix.xcodeproj -scheme Solennix -destination 'platform=iOS Simulator,name=iPhone 17'` → **TEST SUCCEEDED** (425 tests, 0 failures). iPhone 16 no disponible; se usó iPhone 17 (simulador booted: iPhone 17 Pro Max).
- ADR-1: grid↔eventDate via day-string roundtrip (utcDayFormatter / fromServerDay), NUNCA secondsFromGMT. Test pinned UTC+5 pasó (almacena "2026-06-15", no "2026-06-14").
- `pickerSelectedDay` en el form VM (evita colisión con EventListViewModel.selectedDay).
- APIClient es `actor` concreto sin protocolo mock → tests siguen convención (mutación directa de estado; fetch exitoso modelado inyectando unavailableDates, fetch fallido modelado con lista vacía).
- Proyecto regenerado con `xcodegen` (benign UUID churn + 2 nuevos archivos de test).

## Bloqueos
- Ninguno. Listo para `verify`.

