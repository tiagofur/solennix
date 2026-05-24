# Android Audit — 2026-05-24

## Executive summary

The Android app currently builds and focused debug checks passed during the session, but the app is not lint-clean yet.

Current lint status:

- `./gradlew :app:lintDebug` fails.
- Result: 9 errors, 128 warnings.
- This is separate from Kotlin compilation success.
- The highest-risk findings are release readiness, deep links, permissions, and platform API compatibility.

Lint reports:

- Text: `android/app/build/intermediates/lint_intermediate_text_report/debug/lintReportDebug/lint-results-debug.txt`
- HTML: `android/app/build/reports/lint-results-debug.html`

## Scope

Reviewed areas:

- Android project structure.
- Manifest configuration.
- Build and release configuration.
- Core network/auth setup.
- Lint output.
- Test footprint.
- File size and maintainability hotspots.
- Localization and hardcoded UI strings.
- Recent Android fixes already present locally.

## Current repository state considered

The audit was done with local Android fixes present:

- Calendar duplicate FAB removed.
- Dashboard scroll crash fixed.
- MainActivity locked to portrait orientation.

Relevant changed files:

- `android/app/src/main/AndroidManifest.xml`
- `android/feature/calendar/src/main/java/com/creapolis/solennix/feature/calendar/ui/CalendarScreen.kt`
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt`

## Critical findings

### 1. Quick Settings Tile uses an API 34-only method

File:

- `android/app/src/main/java/com/creapolis/solennix/service/NewEventTileService.kt`

Current code calls:

```kotlin
startActivityAndCollapse(pendingIntent)
```

Lint reports that this overload requires API 34, while the app has:

```kotlin
minSdk = 26
```

Risk:

- Runtime crash or broken Quick Settings tile behavior on Android 8 through Android 13.
- This is an external entry point, so it can fail outside the normal app navigation flow.

Recommendation:

- Gate the API 34 call with `Build.VERSION.SDK_INT >= 34`.
- Provide a compatible fallback for older Android versions.

Priority: P0.

### 2. Reset password deep link is incorrectly configured as an Android App Link

File:

- `android/app/src/main/AndroidManifest.xml`

Current shape:

```xml
<intent-filter android:autoVerify="true">
    <data android:scheme="solennix" />
    <data android:host="reset-password" />
</intent-filter>
```

Lint errors:

- `http(s) scheme is missing, but is required for Android App Links`.
- `Android App Links' host attributes must be valid web domains`.

Technical reason:

- `solennix://reset-password` is a custom scheme.
- `android:autoVerify="true"` is for verified web App Links.

Risk:

- Invalid link verification.
- Inconsistent install-time link behavior.
- Potential release or Play tooling warnings.

Recommendation:

- If this remains a custom scheme, remove `android:autoVerify`.
- If verified App Links are required, add real `https://...` links and configure `assetlinks.json` on the domain.

Priority: P0.

### 3. CAMERA permission implies required hardware

File:

- `android/app/src/main/AndroidManifest.xml`

Current permission:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Missing declaration:

```xml
<uses-feature
    android:name="android.hardware.camera"
    android:required="false" />
```

Risk:

- Play distribution may exclude devices without camera hardware.
- This can unnecessarily block tablets, ChromeOS, or other supported devices.

Recommendation:

- Declare the camera hardware feature as not required if the app can still work without a camera.
- Keep runtime camera permission requested only where needed.

Priority: P0/P1.

### 4. Missing translations fail lint

Files:

- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-en/strings.xml`

Missing English translations:

- `google_web_client_id`
- `shortcut_quick_quote`
- `shortcut_quick_quote_long`
- `shortcut_inventory`
- `shortcut_inventory_long`

Important detail:

- `google_web_client_id` should likely not be translated.
- It should probably be marked with `translatable="false"` or moved to a non-translatable resource.

Risk:

- Lint remains failing.
- Shortcuts may be incomplete in English.
- Release quality gate remains noisy.

Recommendation:

- Add missing `values-en` strings for real user-facing shortcut labels.
- Mark technical identifiers as non-translatable.

Priority: P1.

## High-priority findings

### 5. Target SDK is behind compile SDK

File:

- `android/app/build.gradle.kts`

Current configuration:

```kotlin
compileSdk = 37
targetSdk = 35
```

Risk:

- Play Store requirements continue moving forward.
- Behavior changes become more expensive if delayed.
- Permissions, background work, notifications, and deep links should be tested under the newer target.

Recommendation:

- Plan target SDK upgrade.
- Test notifications, deep links, orientation, background behavior, billing, and file sharing.

Priority: P1.

### 6. Portrait-only orientation is intentional, but has platform tradeoffs

File:

- `android/app/src/main/AndroidManifest.xml`

Current configuration:

```xml
android:screenOrientation="portrait"
```

This matches the current product decision: the Android app should not be usable in landscape.

Lint warning:

- Locked orientation can hurt ChromeOS/tablet UX.
- Android 16 may ignore fixed orientation restrictions in many cases.

Recommendation:

- Keep portrait lock for now because it is an explicit product requirement.
- Document the limitation.
- Revisit if tablet/ChromeOS becomes important.

Priority: accepted product decision.

### 7. Ktor logs headers globally

File:

- `android/core/network/src/main/java/com/creapolis/solennix/core/network/KtorClient.kt`

Current configuration:

```kotlin
install(Logging) {
    level = LogLevel.HEADERS
    logger = Logger.DEFAULT
}
```

Risk:

- Sensitive request metadata may be visible in release logs.
- Authorization-related data must not be assumed safe without explicit verification.

Recommendation:

- Enable request logging only for debug builds.
- Use `LogLevel.NONE` in release builds.
- Explicitly redact sensitive headers if logging remains enabled anywhere.

Priority: P1.

### 8. Bearer tokens are sent without request filtering

File:

- `android/core/network/src/main/java/com/creapolis/solennix/core/network/KtorClient.kt`

Current configuration:

```kotlin
sendWithoutRequest { true }
```

Risk:

- Bearer tokens are attached proactively.
- This is acceptable only if requests are strictly limited to the trusted API host.
- It becomes risky if absolute URLs or third-party hosts are introduced later.

Recommendation:

- Restrict token sending by host.
- Consider filtering by protected API route if practical.

Priority: P1/P2.

## Build and release readiness

### Positive finding: release secret checks are strong

File:

- `android/app/build.gradle.kts`

The build script fails release builds if required production config is missing:

- Release signing config.
- RevenueCat API key.
- SSL pins.
- At least two SSL pins.

This is a good release-safety pattern.

### Remaining release recommendation

Debug builds intentionally allow empty SSL pins.

That is fine for development, but release candidates should be tested with release-like config:

- real API host,
- real RevenueCat key,
- real SSL pins,
- minification enabled,
- shrink resources enabled.

Priority: P1.

## Architecture and maintainability

### 9. Several files are too large

Largest files found:

- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/viewmodel/EventFormViewModel.kt` — 1460 lines.
- `android/feature/calendar/src/main/java/com/creapolis/solennix/feature/calendar/ui/CalendarScreen.kt` — 1277 lines.
- `android/feature/staff/src/main/java/com/creapolis/solennix/feature/staff/ui/TeamMemberPortalScreen.kt` — 1152 lines.
- `android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/QuickQuoteScreen.kt` — 1023 lines.
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt` — 1018 lines.

Risk:

- Higher regression probability.
- Slower reviews.
- Harder state isolation.
- Harder UI testing.
- Business rules, side effects, and presentation can become coupled.

Recommendation:

- Add behavior tests before refactoring.
- Split large screens by sections/components.
- Split large ViewModels by state, validation, effects, and use-case boundaries.
- Avoid large mechanical refactors without tests.

Priority: P1/P2.

### 10. Error handling has multiple concepts

Observed areas:

- `ApiService.kt`
- `ApiErrorMapper.kt`
- `SolennixException`
- `ApiError`

Risk:

- Different screens may map errors differently.
- UX can become inconsistent.
- Backend contract changes become harder to verify across the app.

Recommendation:

- Standardize error mapping boundaries.
- Keep one domain-facing error model per layer.
- Add contract tests for important backend error responses.

Priority: P2.

## Testing

### 11. Test footprint is light compared to app size

Observed:

- 29 JVM test files.
- 2 Android instrumentation test files.

Risk:

- Published app has many critical flows but limited real UI coverage.
- Compose regressions can slip through compile-only validation.
- Deep links, navigation, permissions, and system entry points need device-level coverage.

Recommended smoke coverage:

- Login and token refresh.
- Dashboard load and scroll.
- Calendar open and quick actions.
- Event creation/editing.
- Quote creation.
- Payment inbox/public payment flows.
- Deep links.
- Notification tap flow.
- Quick Settings tile flow.
- Camera/image upload permission flow.

Priority: P1.

## Localization and UX copy

### 12. Many UI strings are hardcoded in Kotlin

Examples observed:

- `EventFormLinksScreen.kt`
- `PaymentInboxScreen.kt`
- `TermsScreen.kt`
- `BillingManager.kt`
- `EventDayNotificationManager.kt`

Risk:

- Inconsistent localization.
- Harder accessibility review.
- Harder QA for English mode.
- Harder copy changes.

Recommendation:

- Move user-facing UI strings to resources.
- Keep Spanish as default UI language.
- Complete English resources where the app supports English.
- Keep technical constants out of translated resources.

Priority: P2.

## Dependency and tooling warnings

Lint reported available dependency updates including:

- Compose BOM: `2025.12.01` to `2026.05.01`.
- AndroidX Security Crypto: `1.1.0-alpha06` to `1.1.0`.
- Billing Client: `8.3.0` to `9.0.0`.
- Vico: `2.5.0` to `3.1.0`.
- Gradle: `9.4.1` to `9.5.1`.

Recommendation:

- Do not upgrade everything blindly.
- Upgrade security and billing deliberately first.
- Run billing purchase tests after Billing Client upgrade.
- Run screenshot/smoke tests after Compose BOM upgrade.

Priority: P2.

## Recent Android fixes verified during the session

### Calendar duplicate FAB

File:

- `android/feature/calendar/src/main/java/com/creapolis/solennix/feature/calendar/ui/CalendarScreen.kt`

Result:

- Removed the screen-level Calendar FAB.
- The global quick actions FAB remains the single action entry point.
- It provides the expected actions such as Event and Quick Quote.

### Dashboard scroll crash

File:

- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt`

Result:

- Scroll crash was fixed by avoiding unbounded same-axis scroll measurement in compact layout.
- `fillMaxHeight()` is only applied for wide screens.

### Portrait-only mode

File:

- `android/app/src/main/AndroidManifest.xml`

Result:

- `MainActivity` is locked to portrait orientation.

## Recommended action plan

### P0 — fix immediately

1. Fix `NewEventTileService` API 34 compatibility.
2. Fix reset-password deep link manifest configuration.
3. Declare camera hardware as not required if camera is optional.

### P1 — before next Android release

4. Fix missing translations and non-translatable technical strings.
5. Disable or guard Ktor logging in release.
6. Restrict bearer token sending by trusted host.
7. Add instrumentation smoke tests for critical flows.
8. Run release-like QA with SSL pins, RevenueCat key, minification, and shrink resources enabled.
9. Plan target SDK upgrade.

### P2 — reduce regression cost

10. Split the largest ViewModels and screens.
11. Move hardcoded UI strings into string resources.
12. Clean unused resources.
13. Upgrade dependencies deliberately.

## Verification commands

Executed during this audit/session:

```bash
./gradlew :app:lintDebug
```

Result:

- Failed with 9 errors and 128 warnings.

Previously executed during the Android session:

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

## Final assessment

The Android app is functional enough to build and test in debug, but it is not release-clean.

The immediate risk is not the large Compose code itself. The immediate risk is platform correctness:

- invalid App Link configuration,
- API 34-only call on minSdk 26,
- camera distribution filtering,
- lint-blocking translations,
- release logging/token behavior to review.

The right order is:

1. Fix P0 lint errors.
2. Add smoke coverage around critical flows.
3. Then refactor large files.

Refactoring first would be backwards. Stabilize the foundation before moving walls.
