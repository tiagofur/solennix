---
name: client-surfaces
description: "Native client surfaces of Solennix: iOS (SwiftUI + SPM packages: SolennixCore/Design/Network/Features) and Android (Jetpack Compose + Hilt + Ktor + Room), with cross-platform contract parity against contracts/openapi.yaml."
---

# Stack Context Skill: Native Client Surfaces (iOS & Android)

Load this skill whenever reading, implementing, or reviewing files under `ios/**`, `android/**`, `*.swift`, or `*.kt`.

**Reference Docs**: [`docs/stack/mobile-native-vs-tauri.md`](../../../docs/stack/mobile-native-vs-tauri.md), [`ADR-0002`](../../../docs/architecture/adr/ADR-0002-client-surfaces-and-mobile-matrix.md), [`ADR-0003`](../../../docs/architecture/adr/ADR-0003-contract-first-openapi.md).

> Solennix has **no desktop/Tauri surface** (`factory.manifest.json`: backend, web, ios-native, android-native). If a Tauri standard is ever needed, see `docs/stack/desktop-tauri-v2.md`.

---

## 1. Symmetric Module Structure (port-friendly)

| Layer | iOS (`ios/`) | Android (`android/`) |
| :--- | :--- | :--- |
| **Project** | xcodegen from `ios/project.yml` | Gradle KTS (`app/build.gradle.kts`) |
| **Domain models** | `SolennixCore` (SPM package) | `core/model` |
| **Design system** | `SolennixDesign` | `core/designsystem` |
| **Network** | `SolennixNetwork` (managers, `AuthManager`) — hand-mirrors `contracts/openapi.yaml` | `core/network` (Ktor + auth interceptors) |
| **Features** | `SolennixFeatures/<Feature>`: Auth, Calendar, CalendarSync, Clients, Dashboard, Events, Inventory, Onboarding, Payments, Products, PublicProfile, Requests, Search, Settings, Staff, Shared | `feature/<name>`: auth, calendar, clients, dashboard, events, inventory, payments, products, requests, search, settings, staff |
| **UI** | `<Feature>View.swift` + `@Observable <Feature>ViewModel` (`@MainActor`) | `<Feature>Screen.kt` + `@HiltViewModel` exposing `StateFlow<UiState>` |
| **Subscriptions** | RevenueCat entitlement `pro_access` (StoreKit config `SolennixProducts.storekit`) | RevenueCat `com.revenuecat.purchases` |
| **Offline** | Package cache behind Repository protocols | `core/data` — Room behind Repository interfaces |

---

## 2. Hard Rules

1. **Contract Parity (C2)**: DTOs hand-maintained to mirror `contracts/openapi.yaml`; a contract change must propagate to `SolennixNetwork`/`SolennixCore` and `core/network`/`core/model` in the same work unit (AGENTS.md §3 parity matrix). Swift/Kotlin codegen is aspirational (ADR-0003 §2.1).
2. **Unidirectional Data Flow**: Views observe immutable `UiState` (`loading`/`content`/`error`) and emit intents to ViewModels; views never call network/DB directly.
3. **Portal Roles**: `team_member` → full portal replacement (`TeamMemberPortalView` / `MainNavHost.kt`); `assistant` → read-only secretary portal (Business-only). Respect role gating parity.
4. **Localization**: all user-visible text via `Localizable.strings` / `strings.xml` (es/en) — no hardcoded strings.
5. **Cognitive File Budget**: keep `.swift`/`.kt` files under ~500 lines (`docs/agent-first-methodology.md`).

---

## 3. Verification Commands (`V1` & `V2`)

```bash
# iOS (DEVELOPER_DIR must point at the active Xcode)
cd ios && xcodegen generate
xcodebuild test -scheme SolennixFeatures -destination 'platform=iOS Simulator,name=iPhone 16'

# Android
cd android && ./gradlew test
cd android && ./gradlew build
```
