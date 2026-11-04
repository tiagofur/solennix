# Mobile Engineering Standard: Tauri v2 Mobile vs. Native iOS & Android (`mobile-native-vs-tauri.md`)

This guide operationalizes the **3-Tier Mobile Decision Matrix** in [`ADR-0002`](../architecture/adr/ADR-0002-client-surfaces-and-mobile-matrix.md), balancing **UX quality**, **OS capability access**, and **agent token efficiency**.

---

## 1. Decision Checklist Before Writing Mobile Code

Evaluate these five questions during Day-0 bootstrap (`./scripts/init-project.sh`) or when adding a mobile surface:

| Evaluation Criterion | Choose **Tier 1: Tauri v2 Mobile (`mobile-tauri`)** | Choose **Tier 3: Native (`ios-native` + `android-native`)** |
| :--- | :--- | :--- |
| **Primary Goal** | Fast MVP validation (<2–4 weeks), internal tool, or B2B companion | Flagship consumer product, high retention, App Store / Play Store featured UX |
| **UI Complexity** | Forms, lists, dashboards, standard CRUD flows already built in `apps/web` | 120Hz gesture-driven navigation, complex transitions, custom canvas/camera/audio |
| **OS Integrations** | Basic camera, share sheet, push notifications, biometric prompt | Home Screen Widgets, Live Activities, Apple Watch/WearOS, HealthKit, Background Sync, NFC/BLE |
| **Offline & Lifecycle** | Foreground-mostly usage with online API or simple local cache | Reliable background uploads/downloads, silent push processing, deep offline sync |
| **Token & Time Budget** | **~1.0x** (reuses 95% of `apps/web` React + Vite codebase) | **~1.8x–2.2x** (mitigated via OpenAPI 3.1 codegen & symmetrical MVVM architecture) |

---

## 2. Tier 1 Guidelines: Tauri v2 Mobile (`apps/mobile-tauri`)

When `mobile-tauri` is active in `factory.manifest.json`, the mobile targets (`gen/apple`, `gen/android`) wrap the shared React + Vite frontend. To ship a clean Tier 1 app without fighting the mobile WebView:

1. **Safe Areas & Viewport Discipline**:
   - Always use `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` and `100dvh` (dynamic viewport height) instead of `100vh`.
   - Test virtual keyboard behavior on both iOS (`WKWebView`) and Android (`WebView`) so bottom action bars are never occluded.
2. **Touch Ergonomics**:
   - Enforce a minimum touch target of **44x44 pt (iOS) / 48x48 dp (Android)**.
   - Disable accidental text selection (`select-none`) and browser tap highlights on navigation chrome.
3. **Know When to Graduate**:
   - Do **not** write complex custom Objective-C/Swift/Kotlin Tauri plugins to work around fundamental WebView lifecycle limits (such as continuous background location or Home Screen Widgets). When a product needs those capabilities, graduate the surface to **Tier 3 Native**.

---

## 3. Tier 3 Guidelines: Native iOS (`SwiftUI`) & Native Android (`Jetpack Compose`)

When `ios-native` (`apps/ios/`) and/or `android-native` (`apps/android/`) are active, we keep token consumption and maintenance overhead low through **strict architectural symmetry** and **Contract-First Code Generation (`ADR-0003`)**.

### 3.1 Token-Saving Symmetry Rule
Both native apps mirror the exact same module structure and naming conventions so an `implementer` agent can port a feature between iOS and Android with minimal reasoning overhead:

| Layer | iOS (`apps/ios/` — Swift 6 + SwiftUI) | Android (`apps/android/` — Kotlin + Jetpack Compose) |
| :--- | :--- | :--- |
| **Contract Models & API** | Generated from `contracts/openapi.yaml` (`swift-openapi-generator`) | Generated from `contracts/openapi.yaml` (`openapi-generator` + `kotlinx.serialization`) |
| **UI Layer** | Pure `SwiftUI` Views (`<Feature>Screen.swift`) | Pure `@Composable` functions (`<Feature>Screen.kt`) |
| **State & Logic** | `@Observable final class <Feature>ViewModel` (`@MainActor`) | `@HiltViewModel class <Feature>ViewModel` exposing `StateFlow<UiState>` |
| **Persistence / Offline** | `SwiftData` / `GRDB` behind Repository protocol | `Room` / `SQLDelight` behind Repository interface |
| **Testing (`V1`)** | `Swift Testing` (`@Test`) against ViewModels with fake repositories | `JUnit5` + `kotlinx-coroutines-test` (`runTest`) + `Turbine` |

### 3.2 Native Non-Negotiables
1. **Zero Hand-Rolled Network DTOs**: All HTTP request/response structs and RFC 9457 `ProblemDetails` models are generated from `contracts/openapi.yaml`.
2. **Unidirectional Data Flow (UDF)**: Views observe immutable state (`UiState`: `loading`, `content`, `error`) and emit user intents (`onEvent`) to the `ViewModel`. Views never perform direct network or database calls.
3. **File Size Cap**: Keep every `.swift` and `.kt` file under **~500 lines** (`docs/agent-first-methodology.md`).

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# Tier 1 (Tauri Mobile):
npm --prefix apps/web test -- --run
cargo test --manifest-path apps/mobile-tauri/src-tauri/Cargo.toml

# Tier 3 (iOS Native - Swift Package / Xcode):
swift test --package-path apps/ios

# Tier 3 (Android Native - Gradle):
./apps/android/gradlew -p apps/android testDebugUnitTest
```
