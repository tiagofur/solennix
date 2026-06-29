# Tasks: ios-empty-states (Sprint 4)

> Direct migration of 63 `EmptyStateView(...)` call sites (29 files, `ios/Packages/SolennixFeatures`) + EventListView's hand-rolled filtered block to Apple `ContentUnavailableView` (CUV), then delete the component. Category-ordered **stacked PRs** (force-chained). Lines grounded via `rg 'EmptyStateView\('`. Field map (every site): icon→`systemImage`, title→`title`, message→`description`, action→`button`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900 total (PR1 ~150 / PR2 ~340 / PR3 ~370) |
| 400-line budget risk | Medium (PR2 & PR3 approach 400; 800-line budget holds) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Search/Filtered → PR2 Truly-empty → PR3 Error + delete |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | PR | Base | Verification / Rollback |
|------|------|----|------|-------------------------|
| 1 | Search/filtered → `CUV.search(text:)` / plain CUV + clear | PR1 | main | count 63→52; revert; `xcodebuild test` green |
| 2 | Truly-empty → CUV teaching; 8 first-run CTAs into `actions:`; hero `.tint`+`.hierarchical` | PR2 | PR1 | count 52→24; revert; test green |
| 3 | Error → CUV (retry kept, no-action stays); DELETE `EmptyStateView.swift` | PR3 | PR2 | count 24→0; revert restores file |

## Phase 1 — PR1: Search/Filtered (iOS, stacked on `main`)

- [ ] 1.1 `ClientListView` 156, 284 → `ContentUnavailableView.search(text:)` (pure-search, `.searchable`).
- [ ] 1.2 `StaffListView` 135, 312 → `.search(text:)` (`.solennixSearchable`).
- [ ] 1.3 `StaffTeamListView` 88 → `.search(text:)`.
- [ ] 1.4 `ReviewsView` 78 → `.search(text:)`.
- [ ] 1.5 `PaymentInboxView` 222 → `.search(text:)`.
- [ ] 1.6 `ProductListView` 149, 259 → branch: text query active ⇒ `.search(text:)`; category-filter-only ⇒ plain CUV + clear-filters button (MUST NOT `.search(text:)`).
- [ ] 1.7 `InventoryListView` 157, 370 → branch: text ⇒ `.search(text:)`; low-stock-filter-only ⇒ plain CUV + clear-filters.
- [ ] 1.8 `EventListView` 746-772 hand-rolled filtered block → plain CUV with clear-filters action; preserve "Limpiar filtros" (NOT an EmptyStateView site — migrated separately).
- [ ] 1.9 Verify: `rg -c 'EmptyStateView\(' ios/Packages/SolennixFeatures` sums to 52; build + `xcodebuild test` green. Commit: `refactor(ios): migrate search/filtered empty states to ContentUnavailableView`.

## Phase 2 — PR2: Truly-empty + first-run (iOS, stacked on PR1)

- [ ] 2.1 `ClientListView` 136, 172 → CUV teaching description.
- [ ] 2.2 `ProductListView` 207, 351 → CUV teaching.
- [ ] 2.3 `InventoryListView` 149, 313, 362, 410 → CUV teaching.
- [ ] 2.4 `StaffListView` 218, 325; `StaffTeamListView` 165; `StaffTeamFormView` 226 → CUV teaching.
- [ ] 2.5 `PaymentInboxView` 231, 241 → CUV teaching.
- [ ] 2.6 `EventFormLinksView` 89; `EventShoppingListView` 214; `EventStaffDetailView` 64 → CUV teaching.
- [ ] 2.7 `EventExtrasDetailView` 47; `EventSuppliesDetailView` 47; `EventProductsDetailView` 47; `EventPurchaseChecklistView` 44; `EventChecklistView` 31; `EventEquipmentDetailView` 48; `EventListView` 779 → CUV teaching.
- [ ] 2.8 `Step4PersonnelPanel` 142, 257; `ReviewsView` 85; `TeamMemberPortalView` 101 → CUV teaching.
- [ ] 2.9 8 first-run CTA sites: move the separate `NavigationLink` CTA into the CUV `actions:` builder (navigation unchanged). Hero first-run screens add `.tint(SolennixColors.primary)` + `.symbolRenderingMode(.hierarchical)`.
- [ ] 2.10 Verify: count 52→24; build + `xcodebuild test` green. Commit: `refactor(ios): migrate truly-empty and first-run states to ContentUnavailableView`.

## Phase 3 — PR3: Error + delete component (iOS, stacked on PR2)

- [ ] 3.1 Retry sites (`wifi.exclamationmark`) → CUV with existing retry `button`: `ClientListView` 119, 262; `EventListView` 562, 685; `PaymentInboxView` 91, 189; `ProductListView` 234; `InventoryListView` 340; `StaffListView` 245; `StaffTeamListView` 71; `ReviewsView` 68; `EventFormLinksView` 79; `EventStaffDetailView` 54.
- [ ] 3.2 No-action sites (`exclamationmark.triangle`) → CUV with **NO** action button, copy verbatim: `EventDetailView` 43; `EventShoppingListView` 71; `EventFinancesDetailView` 28; `EventContractPreviewView` 58; `EventPaymentsDetailView` 30; `ClientDetailView` 41; `StaffDetailView` 46; `StaffTeamDetailView` 34; `InventoryDetailView` 313; `TeamMemberPortalView` 88; `ProductDetailView` 255.
- [ ] 3.3 Verify: `rg 'EmptyStateView\(' ios/Packages` ⇒ 0 matches (was 63).
- [ ] 3.4 DELETE `ios/Packages/SolennixDesign/Sources/SolennixDesign/Components/EmptyStateView.swift` (incl. its `#Preview` refs at lines 65, 77).
- [ ] 3.5 Build + `xcodebuild test` green. Commit: `refactor(ios): migrate error states to ContentUnavailableView and delete EmptyStateView`.

## Phase 4 — Verification (testing)

- [ ] 4.1 Mechanical migration — **no new logic to TDD**. Gate is build + grep, not new unit tests.
- [ ] 4.2 After each PR: `rg 'EmptyStateView\(' ios/Packages/SolennixFeatures` monotonic 63→52→24→0; CUV count rises.
- [ ] 4.3 Walk every spec scenario: `.search(text:)` clear-query; clear-filters resets; CTA in `actions:` (nav unchanged); hero gold+hierarchical; retry kept; no-action stays; component deleted zero refs.

## Phase 5 — Docs (always last per `rules.tasks`)

- [ ] 5.1 Update `docs/PRD/11_CURRENT_STATUS.md`: mark EmptyStateView→ContentUnavailableView migration complete (all 63 sites + EventListView filtered block; component deleted). Sprint 4 done.
