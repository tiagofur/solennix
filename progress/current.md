# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **ID:** ios-event-form-blocked-dates
- **Nombre:** iOS event form blocked dates picker (cross-platform parity)
- **Estado:** in_progress
- **Rama:** `feat/ios-event-form-blocked-dates`
- **Estrategia:** single-pr + `size:exception` (mantainer-approved ~450 prod lines)

## Plan de trabajo (SDD apply T1→T8)
- [ ] T1 — CalendarMonthBuilder helper (DRY, behavior-neutral)
- [ ] T2 — EventFormViewModel unavailable-date state + fetch + TZ-safe picker mapping
- [ ] T3 — MonthNavigatorView (extract from EventListView)
- [ ] T4 — EventFormDatePickerSheet (CalendarGridView host)
- [ ] T5 — Step1GeneralView wiring (sheet + inline warning, delete utcEventDateBinding)
- [ ] T6 — Save guard (TZ-safe, before network)
- [ ] T7 — Localization (2 new xcstrings keys ES/EN)
- [ ] T8 — Tests (CalendarMonthBuilderTests + EventFormViewModelUnavailableDateTests; UTC+5 pinned)

## Notas de Desarrollo
- `xcodebuild test -project ios/Solennix.xcodeproj -scheme Solennix -destination 'platform=iOS Simulator,name=iPhone 16'` (./init.sh NO corre iOS).
- ADR-1: grid↔eventDate via day-string roundtrip (utcDayFormatter / fromServerDay), NUNCA secondsFromGMT.
- `pickerSelectedDay` en el form VM (evita colisión con EventListViewModel.selectedDay).
- APIClient es `actor` concreto sin protocolo mock → tests siguen convención (mutación directa de estado + offline-resilience).
- **Android Calendar & Timezone:** Corregido el bug del día anterior en selectores de fecha Android migrando el parseo de `Instant` a `ZoneOffset.UTC`. Se habilitó el bloqueo de fechas no disponibles en el selector mediante `selectableDates` y se integró la carga y sincronización de fechas bloqueadas en la UI del calendario.

## Bloqueos
- Ninguno.

