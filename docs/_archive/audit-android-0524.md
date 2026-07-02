# Android Audit — 2026-05-24

Last updated: 2026-05-25.

## Executive summary

The Android audit started with `:app:lintDebug` failing with 9 errors and 128 warnings. After the Android hardening pass, the critical release blockers found in the audit are fixed and `:app:lintDebug` now passes.

Current status:

- Android P0 audit blockers: done.
- Missing translation lint errors: done.
- Ktor logging/token hardening: done.
- Dashboard scroll crash: done.
- Calendar duplicate FAB: done.
- Portrait-only app behavior: done.
- Dependency sync from GitHub: done.
- Remaining work: release-like QA, target SDK planning, broader instrumentation smoke tests, large-file refactors, continued hardcoded copy cleanup, and tooling/dependency warnings.

Latest relevant commits on `main`:

- `b5a92538 fix(android): resolve audit release blockers`
- `1b79a343 chore(deps): bump androidx.compose:compose-bom in /android (#442)`
- `da4cdbac fix(android): polish dashboard and calendar UX`

## Verification status

Latest verified commands:

```bash
./gradlew :app:lintDebug
./gradlew :core:network:compileDebugKotlin :app:lintDebug
./gradlew :feature:settings:compileDebugKotlin :app:lintDebug
./gradlew :feature:payments:compileDebugKotlin :app:lintDebug
./gradlew :feature:settings:compileDebugKotlin :app:lintDebug
./gradlew :core:network:compileDebugKotlin :app:lintDebug
./gradlew :feature:search:compileDebugKotlin :feature:dashboard:compileDebugAndroidTestKotlin :app:lintDebug
./gradlew :feature:dashboard:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.creapolis.solennix.feature.dashboard.ui.DashboardScreenSmokeTest
./gradlew :feature:search:compileDebugKotlin :app:lintDebug
./gradlew :feature:calendar:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.creapolis.solennix.feature.calendar.ui.CalendarScreenSmokeTest
./gradlew :feature:events:compileDebugKotlin :app:lintDebug
```

Result:

- Passed. ApiService, CompactBottomNavLayout, SearchScreen string resources, and Dashboard smoke-test updates are Gradle-verified.

Previously verified during the Android session:

```bash
./gradlew :feature:calendar:compileDebugKotlin :feature:dashboard:compileDebugKotlin
./gradlew :app:installDebug
./gradlew :app:processDebugMainManifest
./gradlew :app:assembleDebug
./gradlew :feature:payments:testDebugUnitTest :feature:events:testDebugUnitTest :app:testDebugUnitTest
```

Results:

- Compile checks passed.
- App install passed.
- Manifest processing passed.
- Debug assemble passed.
- Focused unit tests passed.
- Pixel 10 Pro emulator smoke verification passed for Dashboard scroll and Calendar FAB behavior.

## Progress board

| Priority | Item | Status | Commit / Evidence |
| --- | --- | --- | --- |
| P0 | Fix Quick Settings Tile API 34 compatibility | Done | `b5a92538` |
| P0 | Fix reset-password deep link manifest configuration | Done | `b5a92538` |
| P0 | Declare camera hardware as optional | Done | `b5a92538` |
| P1 | Fix missing translations and non-translatable technical strings | Done | `b5a92538`; `:app:lintDebug` passes |
| P1 | Disable/guard Ktor logging in release | Done | `b5a92538` |
| P1 | Restrict bearer token sending by trusted host | Done | `b5a92538` |
| P1 | Add instrumentation smoke tests for critical flows | In progress | Auth, Calendar, and Dashboard scroll smoke coverage verified on Pixel 10 Pro emulator |
| P1 | Run release-like QA | Pending | Needs real release config |
| P1 | Plan target SDK upgrade | Pending | `targetSdk = 35`, `compileSdk = 37` |
| P2 | Split large ViewModels/screens | Pending | Needs tests first |
| P2 | Move hardcoded UI strings to resources | In progress | `EventFormLinksScreen.kt`, `TermsScreen.kt`, `PaymentInboxScreen.kt`, `BillingManager.kt`, `EventDayNotificationManager.kt`, `ApiService.kt`, `CompactBottomNavLayout.kt`, `SearchScreen.kt`, `EventPdfFiles.kt`, `EventDetailDocumentActions.kt`, `EventPhotosScreen.kt`, `PhotoGallerySheet.kt`, `EventChecklistScreen.kt`, `EventDetailFinancialCards.kt`, `EventDetailCatalogSubScreens.kt`, `EventDetailContractPreviewScreen.kt`, `EventDetailShoppingContractStaffScreens.kt`, `EventDetailActionComponents.kt`, `EventDetailHubSummaryCards.kt`, `EventDetailScreen.kt`, `EventDetailInventorySubScreens.kt`, `EventDetailFinancialSubScreens.kt`, `PaymentModal.kt`, `UpgradeBanner.kt`, `SwipeRevealActions.kt`, `SolennixTopAppBar.kt`, `StatusBadge.kt`, `UpgradePlanDialog.kt`, `UiEventSnackbarHandler.kt`, `EventFormInventorySections.kt`, `EventFormSuppliesSection.kt`, `EventDetailSummaryMediaComponents.kt`, `EventDetailOverviewComponents.kt`, `EventDetailStaffScreen.kt`, `EventListFiltersSection.kt`, `StaffFormScreen.kt`, `StaffTeamDetailScreen.kt`, `StaffTeamFormScreen.kt`, `StaffTeamListScreen.kt`, `StaffDetailScreen.kt`, and `TeamMemberPortalScreen.kt` cleaned up, and `StaffListScreen.kt` cleaned up; more screens remain |
| P2 | Clean unused resources | Pending | Lint warnings remain |
| P2 | Dependency/tooling cleanup | In progress | GitHub dependency sync done; AGP/Kotlin warnings remain |

## Completed fixes

### P0 — Quick Settings Tile API compatibility

File:

- `android/app/src/main/java/com/creapolis/solennix/service/NewEventTileService.kt`

Original issue:

- `TileService#startActivityAndCollapse(PendingIntent)` requires API 34.
- The app supports `minSdk = 26`.

Fix:

- API 34+ uses the `PendingIntent` overload.
- Android versions below 14 use the compatible `Intent` overload.
- The deprecated fallback is explicitly suppressed because it is intentionally used only below API 34.

Status: done.

### P0 — Reset-password deep link

File:

- `android/app/src/main/AndroidManifest.xml`

Original issue:

- `android:autoVerify="true"` was used on `solennix://reset-password`.
- That is a custom scheme, not an Android App Link.
- Android App Links require `http` or `https` plus a valid web domain.

Fix:

- Removed `android:autoVerify="true"` from the custom scheme intent filter.

Status: done.

Remaining optional improvement:

- If Solennix wants verified web links, add a real `https://.../reset-password` App Link and host `assetlinks.json` on the production domain.

### P0 — Camera hardware distribution filtering

File:

- `android/app/src/main/AndroidManifest.xml`

Original issue:

- `CAMERA` permission implied required camera hardware.
- This can unnecessarily filter devices in Play distribution.

Fix:

```xml
<uses-feature
    android:name="android.hardware.camera"
    android:required="false" />
```

Status: done.

### P1 — Missing translations

Files:

- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-en/strings.xml`

Original issue:

- `google_web_client_id` was reported as missing in English.
- Quick quote and inventory shortcut strings were missing in `values-en`.

Fix:

- `google_web_client_id` is now `translatable="false"`.
- English shortcut strings were added.
- Spanish shortcut labels were cleaned up with accents.

Status: done.

### P1 — Ktor logging hardening

File:

- `android/core/network/src/main/java/com/creapolis/solennix/core/network/KtorClient.kt`

Original issue:

- Ktor header logging was installed globally.
- That created release privacy risk.

Fix:

- Logging is now installed only when `BuildConfig.DEBUG` is true.
- `Authorization` is sanitized when logging is enabled.

Status: done.

### P1 — Bearer token host filtering

File:

- `android/core/network/src/main/java/com/creapolis/solennix/core/network/KtorClient.kt`

Original issue:

```kotlin
sendWithoutRequest { true }
```

Risk:

- Bearer tokens could be attached to absolute URLs if future code introduced non-API requests.

Fix:

- Bearer pre-send is restricted to `BuildConfig.API_HOST`.

Status: done.

### UX fixes already completed

Files:

- `android/feature/calendar/src/main/java/com/creapolis/solennix/feature/calendar/ui/CalendarScreen.kt`
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt`
- `android/app/src/main/AndroidManifest.xml`

Completed:

- Calendar duplicate screen-level FAB removed.
- Global quick actions FAB remains the single entry point for Event and Quick Quote.
- Dashboard scroll crash fixed by avoiding unbounded same-axis scroll measurement in compact layout.
- `MainActivity` locked to portrait orientation.

Status: done.

## Remaining high-priority work

### 1. Release-like QA

Status: pending.

Why it matters:

- Debug build now passes lint, but release configuration still needs validation.
- Release uses minification and resource shrinking.
- Release requires real signing, RevenueCat API key, and SSL pins.

Recommended verification:

```bash
./gradlew :app:assembleRelease
```

Required environment/config:

- Release signing config.
- `REVENUECAT_API_KEY`.
- `SOLENNIX_SSL_PINS` with at least two pins.

Expected value:

- Catches R8, resource shrinking, BuildConfig, RevenueCat, and SSL pin config problems before Store submission.

### 2. Target SDK planning

Status: pending.

Current config:

```kotlin
compileSdk = 37
targetSdk = 35
minSdk = 26
```

Risk:

- Play Store requirements move forward.
- Delaying target SDK changes makes future migration harder.

Recommended approach:

- Treat this as a planned compatibility task, not a blind version bump.
- Test notifications, deep links, permissions, file sharing, billing, widgets, and orientation behavior after the bump.

### 3. Instrumentation smoke tests

Status: in progress.

Current observation:

- JVM test footprint exists.
- Android instrumentation coverage is still thin compared with app surface.
- Existing smoke tests cover Login and Dashboard rendering.
- Calendar smoke coverage was added after this audit update cycle.

Added coverage:

- `android/feature/calendar/src/androidTest/java/com/creapolis/solennix/feature/calendar/ui/CalendarScreenSmokeTest.kt` verifies Calendar chrome, filter chip rendering, empty state rendering, and absence of the removed local create-event FAB.

Verified command:

```bash
./gradlew :feature:calendar:compileDebugAndroidTestKotlin :app:lintDebug
```

Result:

- Passed.

Recommended smoke flows:

- Login and token refresh.
- Dashboard load and scroll.
- Calendar open and quick actions.
- Event creation/editing.
- Quick quote creation.
- Payment inbox/public payment flows.
- Deep links.
- Notification tap flow.
- Quick Settings tile flow.
- Camera/image upload permission flow.

### 4. AGP/Kotlin/Gradle tooling warnings

Status: pending.

Warnings observed during Android builds:

- `org.jetbrains.kotlin.android` plugin is deprecated under AGP 9 built-in Kotlin support.
- Legacy variant APIs are still used by build/plugin configuration.
- Several `android.*` Gradle options are deprecated and scheduled for removal in AGP 10.
- Baseline Profile plugin warns about AGP version compatibility.

Recommended approach:

- Create a separate tooling-modernization task.
- Do not mix it with product bug fixes.
- Verify with full Android build after each migration slice.

### 5. Large file refactors

Status: pending.

Hotspots from the audit:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/viewmodel/EventFormViewModel.kt` — 1460 lines.
- `android/feature/calendar/src/main/java/com/creapolis/solennix/feature/calendar/ui/CalendarScreen.kt` — 1277 lines.
- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/TeamMemberPortalScreen.kt` — 1152 lines.
- `android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/QuickQuoteScreen.kt` — 1023 lines.
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt` — 1018 lines.

Recommendation:

- Add tests before splitting.
- Split by state, validation, effects, and UI sections.
- Avoid mechanical refactors without behavior coverage.

### 6. Hardcoded UI strings

Status: in progress.

Completed cleanup slice:

- `android/feature/settings/src/main/java/com/creapolis/solennix/feature/settings/ui/EventFormLinksScreen.kt` now uses string resources for user-facing copy.
- `android/feature/settings/src/main/java/com/creapolis/solennix/feature/settings/ui/TermsScreen.kt` now uses string resources for legal terms copy.
- `android/feature/payments/src/main/java/com/creapolis/solennix/feature/payments/ui/PaymentInboxScreen.kt` now uses string resources for inbox, dialogs, actions, statuses, and fallback labels.
- `android/feature/settings/src/main/java/com/creapolis/solennix/feature/settings/billing/BillingManager.kt` now uses string resources for user-facing billing errors.
- `android/core/network/src/main/java/com/creapolis/solennix/core/network/EventDayNotificationManager.kt` now uses string resources for notification channel text, actions, and status copy.
- `android/core/network/src/main/java/com/creapolis/solennix/core/network/ApiService.kt` now uses string resources for fallback user-facing network errors.
- `android/app/src/main/java/com/creapolis/solennix/ui/navigation/CompactBottomNavLayout.kt` now uses app string resources for the More menu labels and accessibility text.
- Spanish defaults were added in `android/feature/settings/src/main/res/values/strings.xml` and `android/feature/payments/src/main/res/values/strings.xml`, and `android/core/network/src/main/res/values/strings.xml`, and `android/app/src/main/res/values/strings.xml`.
- English translations were added in `android/feature/settings/src/main/res/values-en/strings.xml` and `android/feature/payments/src/main/res/values-en/strings.xml`, and `android/core/network/src/main/res/values-en/strings.xml`, and `android/app/src/main/res/values-en/strings.xml`.

Verified command:

```bash
./gradlew :feature:settings:compileDebugKotlin :app:lintDebug
./gradlew :feature:payments:compileDebugKotlin :app:lintDebug
./gradlew :feature:settings:compileDebugKotlin :app:lintDebug
./gradlew :core:network:compileDebugKotlin :app:lintDebug
./gradlew :feature:search:compileDebugKotlin :feature:dashboard:compileDebugAndroidTestKotlin :app:lintDebug
./gradlew :feature:dashboard:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.creapolis.solennix.feature.dashboard.ui.DashboardScreenSmokeTest
./gradlew :feature:search:compileDebugKotlin :app:lintDebug
./gradlew :feature:calendar:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.creapolis.solennix.feature.calendar.ui.CalendarScreenSmokeTest
./gradlew :feature:events:compileDebugKotlin :app:lintDebug
```

Result:

- Passed. ApiService, CompactBottomNavLayout, SearchScreen string resources, and Dashboard smoke-test updates are Gradle-verified.

Examples still observed:

- `EventDayNotificationManager.kt`

Risk:

- Inconsistent localization.
- Harder accessibility review.
- Harder QA for English mode.
- More expensive copy changes.

Recommendation:

- Move user-facing copy to string resources.
- Keep Spanish as default.
- Complete English resources where supported.
- Keep technical constants non-translatable.

### 7. Error model consistency

Status: pending.

Observed areas:

- `ApiService.kt`
- `ApiErrorMapper.kt`
- `SolennixException`
- `ApiError`

Risk:

- Different screens may map backend errors differently.
- Backend contract changes can create inconsistent UX.

Recommendation:

- Standardize error mapping boundaries.
- Keep one domain-facing error model per layer.
- Add contract tests for important backend error responses.

## Dependency update status

GitHub sync completed on 2026-05-25.

Merged before the Android hardening commit:

- `1b79a343 chore(deps): bump androidx.compose:compose-bom in /android (#442)`
- `e3a6bdae chore(deps): bump the web-non-major group in /web with 12 updates (#440)`
- `4244abea chore(deps): bump the backend-go-non-major group (#438)`
- `d4425936 chore(deps): bump the remotion-non-major group (#437)`

Post-sync Android verification:

```bash
./gradlew :app:lintDebug
```

Result:

- Passed.

Remaining dependency/tooling items:

- Review Billing Client major update separately if needed.
- Review AndroidX Security Crypto stable migration separately if still pending.
- Address AGP 10 deprecation warnings separately.

### P2 — Search hardcoded UI strings cleanup

Files:

- `android/feature/search/src/main/java/com/creapolis/solennix/feature/search/ui/SearchScreen.kt`
- `android/feature/search/src/main/res/values/strings.xml`
- `android/feature/search/src/main/res/values-en/strings.xml`

Fix:

- Moved Search screen title, back accessibility label, placeholder, section headers, empty state, inventory stock label, and low-stock badge to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event document action hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventPdfFiles.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailDocumentActions.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved PDF chooser text, PDF unavailable toast, PDF download error toast, and document action labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event photos hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventPhotosScreen.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/PhotoGallerySheet.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved photo screen title, accessibility labels, empty states, source picker labels, camera permission toast, delete dialog copy, and action labels to Android resources.
- Added Spanish default resources, English translations, and pluralized photo counts.

Status: done.

### P2 — Event checklist hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventChecklistScreen.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved checklist title, empty state, reset dialog, section headers, purchase total label, progress text, count text, and item quantity label to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event financial cards hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailFinancialCards.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved financial breakdown labels, discount/tax/deposit formats, payment progress label, payment history title, payment delete accessibility label, and delete confirmation dialog copy to Android resources.
- Added Spanish default resources, English translations, and pluralized payment history title.

Status: done.

### P2 — Event catalog sub-screens hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailCatalogSubScreens.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved Products/Extras titles, empty states, count labels, subtotal label, fallback product label, and quantity-price label to Android resources.
- Added Spanish default resources, English translations, and pluralized product/extra counts.

Status: done.

### P2 — Event contract preview hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailContractPreviewScreen.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved contract title, share chooser, share accessibility label, generation error toast, deposit-required copy, missing-data copy, provider/client fallback labels, and signature labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event shopping list hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailShoppingContractStaffScreens.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved remaining shopping-list quantity/unit and quantity multiplier labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event detail action and summary hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailActionComponents.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailHubSummaryCards.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailScreen.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailInventorySubScreens.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailFinancialSubScreens.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved event detail action labels, status menu labels, change-status accessibility text, summary card titles, KPI labels, settle/deposit CTAs, document heading, supply quantity-price format, finance percentage values, discount/tax/deposit formats, and detail navigation accessibility text to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event form suggestion chip hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventFormInventorySections.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventFormSuppliesSection.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved inventory/equipment and supplies suggestion chip labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event detail summary media hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailSummaryMediaComponents.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved event summary navigation card titles, photo preview title, and shopping-list count subtitle to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Design system shared component hardcoded UI strings cleanup

Files:

- `android/core/designsystem/src/main/java/com/creapolis/solennix/core/designsystem/component/PaymentModal.kt`
- `android/core/designsystem/src/main/java/com/creapolis/solennix/core/designsystem/component/UpgradeBanner.kt`
- `android/core/designsystem/src/main/java/com/creapolis/solennix/core/designsystem/component/SwipeRevealActions.kt`
- `android/core/designsystem/src/main/java/com/creapolis/solennix/core/designsystem/component/SolennixTopAppBar.kt`
- `android/core/designsystem/src/main/java/com/creapolis/solennix/core/designsystem/component/StatusBadge.kt`
- `android/core/designsystem/src/main/java/com/creapolis/solennix/core/designsystem/component/UpgradePlanDialog.kt`
- `android/core/designsystem/src/main/res/values/strings.xml`
- `android/core/designsystem/src/main/res/values-en/strings.xml`

Fix:

- Moved shared payment modal labels, payment method chips, date picker actions, swipe action accessibility text, top bar search accessibility text, status labels, upgrade dialog copy, upgrade CTA labels, and close accessibility text to Android resources.
- Kept caller-provided payment modal title/confirm labels supported while localizing default labels.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Staff form and team detail hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/StaffFormScreen.kt`
- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/StaffTeamDetailScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Added Android resources for the staff module.
- Moved staff collaborator form labels, actions, notification copy, team detail labels, delete dialog copy, member fallback, and accessibility labels to resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Staff team form hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/StaffTeamFormScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Moved team form labels, empty states, member picker copy, button labels, and accessibility labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Staff team list hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/StaffTeamListScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Moved team list title, empty state, FAB accessibility label, delete dialog copy, and member count text to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Staff detail hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/StaffDetailScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Moved collaborator detail title, contact labels, fallback values, notification copy, invite access copy, delete/revoke dialogs, and accessibility labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Team member portal main section hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/TeamMemberPortalScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Moved top bar labels, empty assignment state, tabs, pending/recent changes headers, availability form labels, agenda headers, calendar mode labels, and empty-state messages to Android resources.
- Added Spanish default resources and English translations.

Status: done.

Note:

- Validation currently reports an existing Material3 warning in `TeamMemberPortalScreen.kt`: `TabRow` is deprecated and should eventually migrate to `PrimaryTabRow` or `SecondaryTabRow`.
- This was intentionally left untouched while the current pass focuses on translations/hardcoded copy cleanup.

### P2 — Team member portal timeline/calendar/card hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/TeamMemberPortalScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Moved unavailable-date actions, timeline change labels, calendar navigation labels, empty week/day labels, assignment card field labels, accept/decline buttons, and assignment status labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

Validation note:

- First compile attempt caught a Kotlin smart-cast issue after moving `roleOverride` into `stringResource`; fixed with `assignment.roleOverride.orEmpty()`.

### P2 — Staff list hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/StaffListScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Moved staff list title, add-collaborator accessibility label, search placeholder, teams card copy, and empty state copy to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Design system snackbar action hardcoded UI strings cleanup

Files:

- `android/core/designsystem/src/main/java/com/creapolis/solennix/core/designsystem/event/UiEventSnackbarHandler.kt`
- `android/core/designsystem/src/main/res/values/strings.xml`
- `android/core/designsystem/src/main/res/values-en/strings.xml`

Fix:

- Moved snackbar retry and undo action labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Team member portal detail dialog hardcoded UI strings cleanup

Files:

- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/TeamMemberPortalScreen.kt`
- `android/feature/staff/src/main/res/values/strings.xml`
- `android/feature/staff/src/main/res/values-en/strings.xml`

Fix:

- Moved assignment detail dialog field labels, map CTA, execution checklist labels, personal quick notes label, and close action to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event equipment quantity multiplier hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailInventorySubScreens.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Reused the existing `events_detail_quantity_multiplier` resource for equipment quantity badges.
- Removed the remaining inline `xN` visible format from the equipment list.

Status: done.

### P2 — Event overview info hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailOverviewComponents.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved event overview labels for date, schedule, people, location, notes, and the PAX count format to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event staff shift hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailStaffScreen.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved assigned-staff shift range, start-only, and end-only labels to Android resources.
- Added Spanish default resources and English translations.

Status: done.

### P2 — Event list date range chip hardcoded UI strings cleanup

Files:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventListFiltersSection.kt`
- `android/feature/events/src/main/res/values/strings.xml`
- `android/feature/events/src/main/res/values-en/strings.xml`

Fix:

- Moved the date range filter chip format and open-ended range marker to Android resources.
- Added Spanish default resources and English translations.

Status: done.

## Continuation handoff — 2026-05-28

Current branch:

- `main`

Current repository state:

- Android localization changes are still uncommitted.
- New staff resources are untracked under `android/feature/staff/src/main/res/`.
- Do not lose this working tree before committing or continuing.

Latest validated command:

- `cd android && ./gradlew :feature:events:compileDebugKotlin :app:lintDebug`

Latest validation result:

- Passed.
- `git diff --check` also passed.

Work completed in this translation pass:

- Event form inventory/equipment and supplies suggestion chips moved to resources.
- Event detail summary media card titles, photo preview title, and shopping-list subtitle moved to resources.
- Staff module Android resources created with Spanish defaults and English translations.
- Staff form, staff detail, team form, team detail, team list, staff list, and team member portal visible copy moved to resources.
- Design system snackbar retry/undo actions moved to resources.
- Event equipment quantity multiplier moved to existing resource.
- Event overview labels and PAX format moved to resources.
- Event assigned-staff shift labels moved to resources.
- Event list date range chip format and open-ended marker moved to resources.

Known notes:

- Existing `TeamMemberPortalScreen.kt` Material3 `TabRow` deprecation warning remains intentionally untouched until translation cleanup is finished.
- Contract template rendering still contains many Spanish legal/template strings. Treat it as a separate, higher-risk pass because those strings may be business/legal content rather than simple UI labels.
- Technical constants such as MIME types, URLs, shared-preference keys, route/status keys, file-provider authorities, regexes, and date/time patterns should generally stay hardcoded.

Recommended next safe step:

- Continue scanning for small visible UI text formats in Android.
- Prefer one file or one tightly related slice at a time.
- Validate each slice with `:feature:events:compileDebugKotlin :app:lintDebug` when event resources or UI code changes.
- Consider checkpointing with a conventional commit soon because the current Android localization diff is broad.

## Recommended next order

1. Run release-like Android build with real release config.
2. Add smoke instrumentation tests for the riskiest user flows.
3. Plan target SDK upgrade.
4. Clean AGP/Kotlin tooling warnings.
5. Start large file refactors only after tests exist.
6. Continue moving hardcoded UI strings gradually by feature.

## Final assessment

The original release-blocking Android audit findings are now fixed. The app is in a better state than at the start of the audit because `lintDebug` passes and key security/privacy issues in network logging and bearer token behavior are addressed.

The next serious risk is not the already-fixed P0 list. The next serious risk is confidence: release-like verification and real device/instrumentation coverage. Without that, every refactor is more expensive than it needs to be.
