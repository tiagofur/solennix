---
verified: 2026-11-10
---

# Mobile Engineering Standard: Native iOS & Android (`mobile-native-vs-tauri.md`)

This guide operationalizes the **3-Tier Mobile Decision Matrix** in [`ADR-0002`](../architecture/adr/ADR-0002-client-surfaces-and-mobile-matrix.md). **Solennix is a Tier 3 native product** (`ios/`, `android/`); the Tauri tier is a factory standard for future projects and is not active in this repo (see ADR-0002 §2.5).

---

## 1. Decision Checklist Before Writing Mobile Code

When adding a mobile surface to a new factory project, evaluate on Day 0 (`./scripts/init-project.sh`):

| Evaluation Criterion | Tier 1: Tauri v2 Mobile | Tier 3: Native (`ios-native` + `android-native`) |
| :--- | :--- | :--- |
| **Primary Goal** | Fast MVP validation (<2–4 weeks), internal tool, or B2B companion | Flagship consumer product, high retention, App Store / Play Store featured UX |
| **OS Integrations** | Basic camera, share sheet, push notifications, biometric prompt | Home Screen Widgets, Live Activities, HealthKit, Background Sync, NFC/BLE |
| **Offline & Lifecycle** | Foreground-mostly usage with online API or simple local cache | Reliable background uploads/downloads, silent push processing, deep offline sync |
| **Token & Time Budget** | **~1.0x** (reuses the web React + Vite codebase) | **~1.8x–2.2x** (mitigated by contract-driven DTO mirroring & symmetrical MVVM architecture) |

---

## 2. Tier 3 Guidelines: Native iOS (`SwiftUI`) & Native Android (`Jetpack Compose`)

Both native apps mirror the same module structure and naming conventions so an `implementer` agent can port a feature between iOS and Android with minimal reasoning overhead:

| Layer | iOS (`ios/` — Swift + SwiftUI) | Android (`android/` — Kotlin + Jetpack Compose) |
| :--- | :--- | :--- |
| **Project** | Generated with **`xcodegen`** from `ios/project.yml` | Gradle KTS (`android/app/build.gradle.kts`) |
| **Architecture** | SPM packages: `SolennixCore` (domain models), `SolennixDesign`, `SolennixNetwork` (API managers, `AuthManager`), `SolennixFeatures` (feature modules: Auth, Calendar, Clients, Dashboard, Events, Inventory, Payments, Products, Requests, Search, Settings, **Staff**, Shared) | `core/{model,database,designsystem,network}` + `feature/{auth,calendar,clients,dashboard,events,inventory,payments,products,requests,search,settings,staff}` + `widget` |
| **Contract Models & API** | Hand-maintained in `SolennixNetwork`, mirroring `contracts/openapi.yaml` (Swift/Kotlin codegen is aspirational — ADR-0003 §2.1) | Hand-maintained in `core/network` + `core/model`, mirroring `contracts/openapi.yaml` |
| **UI Layer** | Pure `SwiftUI` Views (`<Feature>View.swift`) | Pure `@Composable` functions (`<Feature>Screen.kt`) |
| **State & Logic** | `@Observable final class <Feature>ViewModel` (`@MainActor`) | `@HiltViewModel class <Feature>ViewModel` exposing `StateFlow<UiState>` |
| **DI** | Constructor injection via package composition | **Hilt** |
| **Persistence / Offline** | Package-level cache behind Repository protocols | **Room** behind Repository interfaces |
| **Subscriptions** | RevenueCat (entitlement `pro_access`, StoreKit config `SolennixProducts.storekit`) | RevenueCat (`com.revenuecat.purchases`) |
| **Testing (`V1`)** | Swift Testing / XCTest against ViewModels with fake repositories | JUnit + `kotlinx-coroutines-test` (`runTest`) |

### Native Non-Negotiables
1. **Contract Parity**: DTOs mirror `contracts/openapi.yaml` — a contract change (`C2`) must propagate to `SolennixNetwork`/`SolennixCore` and `core/network`/`core/model` in the same work unit (see `AGENTS.md` §3 parity matrix).
2. **Unidirectional Data Flow (UDF)**: Views observe immutable state (`UiState`: `loading`, `content`, `error`) and emit user intents to the `ViewModel`. Views never perform direct network or database calls.
3. **File Size Cap**: Keep every `.swift` and `.kt` file under **~500 lines** (`docs/agent-first-methodology.md`).
4. **Localization**: All user-visible text resolves through native localization files (`Localizable.strings` / `strings.xml`) — no hardcoded strings.

---

## 3. Verification Commands (`V1` & `V2`)

```bash
# iOS (packages tests; DEVELOPER_DIR must point at the active Xcode):
cd ios && xcodegen generate
xcodebuild test -scheme SolennixFeatures -destination 'platform=iOS Simulator,name=iPhone 16'

# Android:
cd android && ./gradlew test          # unit tests
cd android && ./gradlew build         # compile + lint
```
