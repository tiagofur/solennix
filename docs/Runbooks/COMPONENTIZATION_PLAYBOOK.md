# Componentization Playbook (Professional Standard)

Status date: 2026-05-09
Scope: Android, Web, iOS, Backend API contracts for screen-driven features.

## Why this exists

We are standardizing how large screens are decomposed into maintainable components.
The objective is predictable architecture, easier reviews, lower regression risk, and faster onboarding.

## Current status (Events domain)

### Android

- Event Form: strongly refactored into focused files.
  - Orchestrator: `EventFormScreen.kt` (container only)
  - Chrome: `EventFormChrome.kt`
  - General step: `EventFormGeneralInfoStep.kt`
  - Shared controls: `EventFormGeneralControls.kt`
  - Shared inputs/helpers: `EventFormSharedInputs.kt`
  - Inventory equipment section: `EventFormInventorySections.kt`
  - Inventory supplies section: `EventFormSuppliesSection.kt`
  - Inventory shared controls: `EventFormInventorySharedComponents.kt`
  - Inventory picker sheets: `EventFormInventoryPickers.kt`
  - Staff section: `EventFormStaffSection.kt`
  - Product/Extras steps: `EventFormProductExtrasSteps.kt`
  - Summary step: `EventFormSummaryStep.kt`
  - Picker sheet: `EventFormProductPickerSheet.kt`

- Event List: refactored by concern, but still medium-size files remain.
  - `EventListScreen.kt`
  - `EventListFiltersSection.kt`
  - `EventListItemComponents.kt`
  - `EventListActionSheets.kt`

- Event Detail: split exists, but still has one large support file to keep slicing.
  - `EventDetailScreen.kt`
  - `EventDetailComponents.kt` (medium/large, next slicing candidate)
  - `EventDetailCatalogSubScreens.kt`
  - `EventDetailFinancialSubScreens.kt`
  - `EventDetailShoppingContractStaffScreens.kt`
  - `EventDetailSubScreens.kt`

Conclusion: Priority 1 refactor set is completed.
Primary pending area: Event Detail decomposition depth (`EventDetailComponents.kt`).

## Professional component format (from now on)

### 1) Screen as Orchestrator

Each top-level screen should:
- own navigation and high-level state wiring
- host the page-step/router decision
- delegate UI rendering to feature components
- avoid embedding large business-visual blocks

Target: orchestrator file <= 250 lines (soft limit), <= 400 (hard warning).

### 2) Folder and file slicing by concern

Use concern-based files, not random fragments:
- `*Screen` -> orchestrator
- `*Chrome` -> top bars, nav bars, step indicators, global wrappers
- `*Step` / `*Section` -> feature sections
- `*PickerSheet` / `*ActionSheet` -> modal selectors/actions
- `*SharedInputs` / `*Controls` -> reused UI inputs and controls
- `*Components` -> domain reusable visual blocks

### 3) State and ownership rules

- ViewModel owns business state.
- Components receive only required state + callbacks.
- No duplicated composable ownership across files.
- Shared helper function must exist in one canonical file.

### 4) Cross-platform parity rule

For each feature or refactor affecting behavior, verify parity impacts:
- Android: `android/feature/**`
- iOS: `ios/Packages/SolennixFeatures/**` + related ViewModels
- Web: `web/src/pages/**`, `web/src/components/**`, `web/src/services/**`
- Backend: `backend/internal/handler/**`, `service/**`, `repository/**`, models/contracts

Refactor-only UI moves without behavior changes can stay platform-local,
but architecture conventions should be mirrored across platforms.

### 5) API contract safety

If refactor touches payload mapping or model shaping:
- keep backend snake_case contract stable
- keep frontend/viewmodel mapping explicit
- add/update tests for serializers/adapters where relevant

### 6) Incremental slicing workflow (mandatory)

1. Pick one closed slice (single concern).
2. Extract/move code to a dedicated file.
3. Remove original duplicated block.
4. Run diagnostics immediately.
5. Validate canonical ownership (no duplicate definitions).
6. Measure line-count impact.
7. Save architectural decision to Engram.

Never do a massive move in one step.

### 7) Quality gates per slice

- No editor errors in touched files.
- No duplicate symbol ownership.
- Behavior unchanged for the slice.
- Naming consistent with the playbook.
- File size trend improving.

### 8) Naming conventions

- Components: `PascalCase` function names.
- File suffixes:
  - `Screen.kt`, `Step.kt`, `Section.kt`, `Chrome.kt`, `SharedInputs.kt`, `PickerSheet.kt`.
- Keep domain language stable (Event, Client, Product, Inventory, Staff).

## Immediate next backlog (recommended order)

1. Event Detail: split `EventDetailComponents.kt` into concern files (timeline, documents, status, support cards).
2. Event List: move any remaining modal/filter/render blocks out of `EventListScreen.kt` if they exceed limits.
3. Web and iOS: mirror inventory/event concern-based slicing patterns for structural parity.
4. Backend contracts: verify no serializer/mapper drift after UI-only refactors.

## Definition of done for a refactored screen

A screen is considered professionally refactored when:
- orchestrator is thin and readable
- feature sections are isolated by concern
- helper ownership is unique and discoverable
- no duplicated composables remain
- diagnostics are clean after each extraction
- parity and contracts are not regressed
