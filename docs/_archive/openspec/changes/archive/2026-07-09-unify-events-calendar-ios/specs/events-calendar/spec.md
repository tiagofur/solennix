# Delta for Events Calendar Unification (iOS)

> Platform: **iOS only**. Web (already unified, "REFACTOR FASE 7C") and Android
> (deferred — EventKit parity exception) are out of scope. Strict TDD is ACTIVE:
> every scenario is an XCTest target against `EventListViewModel` observable state
> or a rendered view assertion.

## ADDED Requirements

### Requirement: Unified Eventos View Modes

The unified Eventos screen MUST host a `viewMode` state (`.lista` | `.calendario`)
driven by a toggle in the content header. Both modes MUST render from the SAME
`EventListViewModel` instance, so toggling MUST NOT reload events or drop the
current selection. The default mode MUST be `.lista` and MUST NOT be persisted.

#### Scenario: Toggle switches mode and preserves events

- GIVEN `EventListViewModel` has loaded a non-empty events list in `.lista`
- WHEN the user taps the Calendario toggle in the content header
- THEN `viewMode` MUST become `.calendario`
- AND the rendered events MUST be the same set from the existing ViewModel (no reload)

#### Scenario: Default entry is Lista and is not persisted

- GIVEN a fresh app launch (no prior `viewMode` stored)
- WHEN Eventos appears
- THEN `viewMode` MUST be `.lista`
- AND no value for `viewMode` MUST be written to `@AppStorage`/`UserDefaults`

#### Scenario: Calendario reuses eventCard for the filtered list

- GIVEN Eventos is in `.calendario` with a selected day that has events
- WHEN the filtered list renders
- THEN it MUST render the SAME `eventCard` used in `.lista`
- AND it MUST NOT render a distinct `eventRowContent` row

### Requirement: Calendar Day Interactions

In `.calendario`, a day cell MUST support a short tap and a distinct long-press.
Tap MUST apply a single-day date filter; long-press MUST open `BlockDateSheet`
for an `UnavailableDate`. The two gestures MUST NOT trigger each other.

#### Scenario: Day tap filters events to that day

- GIVEN Eventos in `.calendario` with events spanning multiple days
- WHEN the user taps a day that has events
- THEN the filtered list MUST show only events whose date equals the tapped day
- AND `selectedDay` on the ViewModel MUST equal the tapped date

#### Scenario: Day long-press opens BlockDateSheet

- GIVEN Eventos in `.calendario`
- WHEN the user performs a long-press (≥ minimum duration) on a day cell
- THEN `BlockDateSheet` MUST open for that day
- AND the day-tap filter MUST NOT be applied as a side effect

### Requirement: Period Date-Range Filter Chips

Eventos MUST expose period chips `Hoy · Esta semana · Este mes · Personalizado`
that drive a single shared date-range filter in BOTH modes. `Personalizado` MUST
be defined by a start date and an end date chosen via two sequential taps.

#### Scenario: Hoy and Esta semana apply bounded ranges

- GIVEN Eventos showing events across several days
- WHEN the user taps `Hoy`
- THEN only today's events MUST be shown
- WHEN the user then taps `Esta semana`
- THEN only events within the current calendar week MUST be shown

#### Scenario: Personalizado defines a start-then-end range

- GIVEN Eventos in either mode
- WHEN the user selects `Personalizado`, taps a start date, then taps an end date
- THEN the filter MUST span `[start, end]` inclusive
- AND only events within that range MUST be shown

### Requirement: Adaptive Layout by Size Class

The Calendario layout MUST adapt to the device: iPad in landscape MUST render a
split (grid left, filtered events list right); iPhone MUST stack the grid above
the filtered list.

#### Scenario: iPad landscape uses split layout

- GIVEN an iPad in landscape (regular width and height)
- WHEN Eventos renders in `.calendario`
- THEN the grid and the filtered events list MUST appear side by side

#### Scenario: iPhone stacks grid above list

- GIVEN an iPhone (compact width)
- WHEN Eventos renders in `.calendario`
- THEN the grid MUST appear above the filtered events list

### Requirement: First-Run Onboarding Tip

A first-run tip explaining that the Calendar now lives inside Eventos MUST be
shown exactly once. Visibility MUST be gated by a single `@AppStorage` flag that
is set true after dismissal.

#### Scenario: Tip shown once then suppressed

- GIVEN the onboarding `@AppStorage` flag is unset/false
- WHEN Eventos appears for the first time
- THEN the tip MUST be shown
- WHEN the user dismisses it
- THEN the flag MUST be set true and the tip MUST NOT appear on subsequent launches

## MODIFIED Requirements

### Requirement: Events App Bar

The Eventos app bar MUST keep the status filter and MUST remove the `calendar`
filter button. No calendar entry point may remain in the app bar; the view toggle
in the content header is the sole calendar entry.
(Previously: app bar contained both a `calendar` filter button and a status filter.)

#### Scenario: App bar exposes only the status filter

- GIVEN Eventos in either mode
- WHEN the app bar renders
- THEN the status filter MUST be present
- AND the `calendar` filter button MUST NOT be present

## REMOVED Requirements

### Requirement: Dedicated Calendar Screen

(Reason: `CalendarView` + `CalendarViewModel` + `eventRowContent` duplicated the
`Event` rendering of Eventos (`eventCard`) and were backed by a parallel
ViewModel hitting the same `Endpoint.events`; the iCal snapshot export also
drifted on every edit.)
(Migration: calendar functionality is absorbed by the Eventos `.calendario` mode
reusing `CalendarGridView`, `BlockDateSheet`, and `BlockedDatesSheet`; the
`UnavailableDate` domain and `/unavailable-dates` endpoints are unchanged.
`CalendarView`, `CalendarViewModel`, `eventRowContent`, and
`exportCalendarToFile()` (iCal) MUST be deleted.)
