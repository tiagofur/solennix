# Tasks: Unify Events + Calendar on iOS

> iOS-ONLY. No Web/Android/backend code. **Strict TDD ACTIVE**: every behavior
> task is RED→GREEN (write the failing XCTest first, then minimal impl). Commits
> are work-units: test + impl together, Conventional Commits, no AI attribution.
> All new code lives in `ios/Packages/...` (`SolennixFeatures` / `SolennixCore` /
> `SolennixNetwork`); `Tab`/`SidebarSection` live in the app target.

## Review Workload Forecast

Review budget: **800 changed lines** (per delivery config; higher than the 400
default). This change spans ~24 files (12 create, 9 modify, 5 remove/move) plus
tests for all 25 scenarios → total churn **~2,200–2,600 lines**. Well over a
single PR. Chained PRs are mandatory.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,200–2,600 (add ~1,600–1,900; del ~500–700) |
| Review budget | 800 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain (recommended; user confirms per ask-always) |
| Decision needed before apply | Yes |

### Suggested Work Units (PR slices, each ≤800 lines)

| Unit | Goal | Likely PR | Base branch | Depends |
|------|------|-----------|-------------|---------|
| 1 | Test infra + protocol seams (EventAPI, SystemCalendarSyncing, identity store) — zero behavior change | PR 1 | `feature/unify-events-calendar-ios` | — |
| 2 | `EventKitSyncService` actor + `EventRepository` (CRUD→sync, migration, resilience) | PR 2 | PR 1 branch | PR 1 |
| 3 | Rewire 2 mutation VMs to repository + unified `EventListViewModel` state | PR 3 | PR 2 branch | PR 2 |
| 4 | Unified `EventListView` (toggle, chips, calendario mode, gestures, layout factory) + snapshots | PR 4 | PR 3 branch | PR 3 |
| 5 | `CalendarSyncPreferencesView`+VM + navigation (4 tabs, new Route) + Settings link | PR 5 | PR 4 branch | PR 4 |
| 6 | Removal (CalendarView/VM/eventRowContent/iCal) + localization + PRD | PR 6 | PR 5 branch | PR 5 |

> feature-branch-chain: PR #1 targets `feature/unify-events-calendar-ios`;
> each later PR targets the immediate previous PR branch. Only the tracker merges
> to `main`. If a child diff shows prior slices, retarget/rebase before review.

---

## Phase 1 — Foundation: test infra & protocol seams

- [x] **1.1** [infra] `ios/Packages/SolennixFeatures/Package.swift`: add `pointfreeco/swift-snapshot-testing` dep + `.testTarget(name: "SolennixFeaturesTests", dependencies: [.target(name: "SolennixFeatures"), ...])`. Confirm `swift build` + empty test target green.
- [x] **1.2** [RED→GREEN impl] Create `ios/Packages/SolennixNetwork/Sources/SolennixNetwork/EventAPI.swift`: narrow `protocol EventAPI` (event get/post/put/delete only). **ADR-9 signature fix (REQUIRED)**: inspect real `APIClient` signatures — design typed them `endpoint: Endpoint`/`AnyCodable` but real `APIClient` uses `endpoint: String`/`some Encodable`. Type `EventAPI` to match the **real** signatures (or add documented adapter methods) so `extension APIClient: EventAPI {}` is honest and compiles with zero behavior change. Files: `EventAPI.swift`, `APIClient.swift` (+extension, +adapters if needed).
- [x] **1.3** [RED→GREEN test+impl] Create `SolennixFeaturesTests/.../MockEventAPI.swift`: `@Sendable` recording double asserting endpoint/body calls, returning canned `Event` (ADR-9). Test asserts recorded calls.
- [x] **1.4** [RED→GREEN test+impl] Create `Solennix/.../CalendarSync/SystemCalendarSyncing.swift`: protocol + domain types only (`SyncAuthorization`, `SyncDestination`(.solennix/.personal), `SyncedItem`, identifier-based `SyncedDestination`, `SyncError`). No `EK*` leak (ADR-1).
- [x] **1.5** [RED→GREEN test+impl] Create `MockSystemCalendarSyncing.swift` (test target): recording double covering authorize/request/resolve/create/update/delete/migrate/ensure.
- [x] **1.6** [RED→GREEN test+impl] Create `SolennixFeatures/.../CalendarSync/CalendarSyncIdentityStore.swift`: protocol + `UserDefaultsCalendarSyncIdentityStore` (`event.id → calendarItemIdentifier` + destination) + in-memory test impl (ADR-5). Test set/get/all/clear.

## Phase 2 — Core: sync service & repository

- [ ] **2.1** [RED→GREEN impl] Create `SolennixFeatures/.../CalendarSync/EventKitSyncService.swift`: `actor` owning the only `EKEventStore`; maps domain↔`EKEvent`; resolve/ensure/create/update/delete/migrate per ADR-1/3/4. E2E not unit-tested (real store); covered via repo tests using the mock.
- [ ] **2.2** [RED→GREEN test+impl] Create `SolennixFeatures/.../Events/Repositories/EventRepository.swift` holding `EventAPI` + `SystemCalendarSyncing` + identity store + `syncEnabled`. Test (mocks) covers: `create`/`update`/`changeStatus`/`delete` call EventAPI THEN sync fan-out (guarded by `syncEnabled`), idempotent identity-store rewrite, return `Event`. Covers calendar-sync scenarios: create/edit/delete+idempotent; **write-only** (system edit ignored on next load); implicit-on-CRUD (ADR-2).
- [ ] **2.3** [RED→GREEN test+impl] `EventRepository.changeDestination(to:progress:)`: detached `Task`, per-item delete-old+create-new, rewrite identity store, `progress` 0…1, partial-failure returns `partial:[ids]` keeping old ids, re-runnable (ADR-4). Covers migration scenario.
- [ ] **2.4** [RED→GREEN test+impl] Resilience: `.solennix` missing + sync ON → `ensureSolennixCalendarExists()` then write succeeds; `.personal` missing → `throw SyncError.personalCalendarUnavailable`. Covers 2 missing-calendar scenarios (ADR-3). `syncAuthorization` accessor.

## Phase 3 — ViewModel rewiring & unified state

- [x] **3.1** [RED→GREEN impl] Rewire `EventFormViewModel` (+`Save`/`Items`) to route its 3 mutation sites via `EventRepository` (add `init(..., eventRepository:)`; keep two-call body shape verbatim — no `EventDraft`). Local state patches stay in VM. (ADR-9 rewire)
- [x] **3.2** [RED→GREEN test+impl] `EventListViewModel`: inject `EventRepository`; rewire `confirmDeleteEvent` + `updateEventStatus` through it. Assert API+sync+identity still fan out from the list path.
- [x] **3.3** [RED→GREEN test+impl] Add unified state: `EventPeriodFilter` (.today/.thisWeek/.thisMonth/.custom), `selectedDay`, `currentMonth`, `unavailableDates`, `isBlockingDate`, `calendarError`; `viewMode` stays on the VIEW. Shared-filter invariant: `selectDate(day)` sets selectedDay+dateRange=startOfDay+clears period; period-chip sets period+recomputes dateRange from `Calendar.current`+clears selectedDay. Covers: day-tap filter+selectedDay; Hoy/Semana; Personalizado range; default lista + non-persistence (viewMode). (ADR-7)

## Phase 4 — Unified EventListView UI

- [x] **4.1** [RED→GREEN test+impl] Create `EventosLayoutFactory.make(vm:viewMode:sizeClass:)`; snapshot tests assert `regular×regular`→split, `compact×regular`→stack (ADR-8). Covers iPad-split + iPhone-stack.
- [x] **4.2** [RED→GREEN impl] `EventListView`: add content-header `Lista | Calendario` toggle (`@State var viewMode: EventosViewMode = .lista`, NOT `@AppStorage`); toggling must not touch events/selectedDay. Snapshot/VM test: toggle preserves events, default lista, no persistence.
- [x] **4.3** [RED→GREEN impl] `.calendario` body reuses moved `CalendarGridView` (status dots) + filtered list reusing the SAME `eventCard` (NOT a new row). Snapshot test asserts cell resolves to `eventCard` and `eventRowContent` type absent. Covers "reuses eventCard".
- [x] **4.4** [impl] Wire day-tap (`onTapGesture`→`selectDate`) + long-press (`simultaneousGesture(LongPressGesture(minimumDuration:0.5))`→`onLongPressDate`→`BlockDateSheet`). Test: long-press fires WITHOUT `selectDate` (no mutual trigger). Covers day-tap + long-press scenarios.
- [x] **4.5** [impl] Period chips `Hoy · Esta semana · Este mes · Personalizado` (custom = start+end two taps) in both modes. Covered by 3.3 VM tests + 4.1 snapshot.
- [x] **4.6** [impl] App bar: keep `selectedStatus` filter, REMOVE `calendar` filter button (both viewModes). Test: status present + calendar button absent. Covers app-bar scenario.
- [x] **4.7** [RED→GREEN test+impl] Create `EventosOnboardingTip.swift` (reuse `NewEventTip` TipKit style, single `@AppStorage("eventosOnboardingShown")`); shown once, set true on dismiss, never reappears. Covers onboarding scenario.

## Phase 5 — Settings sync preferences & navigation

- [x] **5.1** [RED→GREEN test+impl] Create `CalendarSyncPreferencesViewModel` (`togglePreference`/`inFlightKeys` parity with `NotificationPreferencesViewModel`); master toggle ON→`requestFullAccessToEvents`, denied→revert+guide to Settings+skip sync; binary destination default `.solennix`, `.personal`→warning. Covers toggle/permission (2), binary destination default+warning (2), preferences-screen inFlightKeys.
- [x] **5.2** [RED→GREEN impl] Create `CalendarSyncPreferencesView` (master `preferenceToggle`, binary destination selector, write-only warning, `.tint(SolennixColors.primary)`, `.solennixRow()`). Wire destination change → `EventRepository.changeDestination`.
- [ ] **5.3** [RED→GREEN impl] `SolennixCore/.../Route.swift`: add `case calendarSyncPreferences`. `ios/Solennix/Navigation/Route.swift`: resolve it to `CalendarSyncPreferencesView`. Covers nav-route scenario.
- [ ] **5.4** [RED→GREEN impl] Remove `.calendar` from `Tab` + `SidebarSection` + `mainSections` (4 destinations: home, events, clients, more). App-test assertions: compact tabs exactly 4, sidebar excludes calendar. Covers tab/sidebar (2).
- [ ] **5.5** [impl] `SettingsView`: add calendar-sync section/link → `Route.calendarSyncPreferences` (both width layouts).

## Phase 6 — Removal, localization & cleanup

- [ ] **6.1** [removal] Move `CalendarGridView`, `BlockDateSheet`, `BlockedDatesSheet` into `Events/Views/`; retype sheet `@Bindable viewModel` → `EventListViewModel`. Create `Events/Models/DateDay.swift` (+ `CalendarError` block subset) moved out of `CalendarViewModel`.
- [ ] **6.2** [removal] Delete `CalendarView.swift` (+ `ActivityView`, `eventRowContent`, iCal button), `CalendarViewModel.swift`, `exportCalendarToFile()`. Confirm no references remain; `xcodebuild` green.
- [ ] **6.3** [impl] `CalendarStrings.swift`: drop iCal/export keys, keep grid/block keys. `Settings/SettingsStrings.swift` + new sync strings via `FeatureL10n` (toggle, destinations, write-only warning, errors). Covers all UI strings.
- [ ] **6.4** [docs] Update `docs/PRD/11_CURRENT_STATUS.md` (REQUIRED last task per `openspec/config.yaml` rules.tasks). Note Web already unified, Android deferred (authorized parity exception).

## Test Strategy Recap — all 25 scenarios covered

- **events-calendar (11)**: 4.1 (split/stack), 4.2 (toggle-preserve, default-lista), 4.3 (reuses-eventCard), 3.3+4.5 (day-tap, hoy/semana, personalizado), 4.4 (long-press), 4.6 (app-bar status-only), 4.7 (onboarding-once).
- **calendar-sync (11)**: 2.2 (write-only, create/edit/delete+idempotent, implicit-CRUD), 2.3 (migration), 2.4 (Solennix-recreate, Personal-missing), 5.1 (toggle/permission×2, binary-destination×2, prefs-inFlightKeys).
- **navigation (3)**: 5.3 (Route resolves + Settings link), 5.4 (4 tabs compact + sidebar no calendar).
- **TDD order**: seams (Phase 1) make every sync behavior assertable before `EKEventStore` exists; layout factory (4.1) makes split/stack assertable before the view body; repository (Phase 2) makes CRUD→sync assertable before VM rewiring. RED test precedes impl in each task.
