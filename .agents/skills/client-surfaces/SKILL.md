---
name: client-surfaces
description: "Multi-surface client architecture: Tauri v2 Desktop (least-privilege capabilities, typed IPC), Tauri v2 Mobile (CRUD MVP), and Native iOS (SwiftUI) / Native Android (Kotlin + Jetpack Compose) with OpenAPI codegen."
---

# Stack Context Skill: Desktop & Mobile Client Surfaces

Load this skill whenever reading, implementing, or reviewing files under `desktop/**`, `src-tauri/**`, `mobile/**`, `ios/**`, `android/**`, `*.swift`, `*.kt`, or `tauri.conf.json`.

**Reference Docs**: [`docs/stack/desktop-tauri-v2.md`](../../../docs/stack/desktop-tauri-v2.md), [`docs/stack/mobile-native-vs-tauri.md`](../../../docs/stack/mobile-native-vs-tauri.md), [`ADR-0002`](../../../docs/architecture/adr/ADR-0002-client-surfaces-web-desktop-mobile.md), [`ADR-0003`](../../../docs/architecture/adr/ADR-0003-contract-first-openapi.md).

---

## 1. Surface Decision Matrix (`ADR-0002`)

Before writing client surface code, verify the active surfaces in `factory.manifest.json`:

| Surface | Technology Stack | When to Use | Token & Maintenance Strategy |
| :--- | :--- | :--- | :--- |
| **Desktop (`desktop-tauri`)** | **Tauri v2** (Rust core + OS WebView hosting `web/` React frontend) | Default for macOS, Windows, and Linux desktop apps (<15 MB bundle, native OS tray/filesystem/keychain integration). | Shares 95%+ UI code with `web/`; Rust layer is restricted to thin OS capabilities and typed IPC commands. |
| **Mobile MVP (`mobile-tauri`)** | **Tauri v2 Mobile** (iOS WKWebView / Android WebView) | Internal tools, B2B forms, or rapid CRUD MVPs where 90%+ of the UI is shared with `web/` and deep background OS APIs are unnecessary. | Minimal token footprint via shared React UI; document WebView keyboard/scroll/background limits explicitly. |
| **Native iOS (`ios-native`)** | **Swift 6 + SwiftUI** + `swift-openapi-generator` | Consumer flagship apps, 120Hz gesture-heavy UX, HealthKit/CoreBluetooth/NFC/Camera pipelines, Widgets, Live Activities, or background tasks. | Eliminate networking/DTO token cost by generating all API models & client code from `contracts/openapi.yaml`. |
| **Native Android (`android-native`)** | **Kotlin + Jetpack Compose** + OpenAPI Generator (`jvm-ktor` / `retrofit2`) | Consumer flagship apps, foreground services, WorkManager offline sync, hardware sensors, or WearOS/platform integrations. | Eliminate networking/DTO token cost by generating Kotlin `data class` models & API clients from `contracts/openapi.yaml`. |

---

## 2. Tauri v2 Desktop & Mobile Rules (`src-tauri/`)

1. **Least-Privilege Capabilities (`src-tauri/capabilities/*.json`)**:
   - Grant only the exact permissions required per window/platform. Never enable wildcard shell or unrestricted filesystem scopes (`$HOME/**`).
2. **Thin, Typed Rust IPC (`#[tauri::command]`)**:
   - Keep Rust commands focused on OS integration, local SQLite/keychain access, or CPU-intensive native tasks.
   - Return `Result<T, AppError>` where `AppError` serializes deterministically with a machine-readable `code` and `message`.
3. **Tauri v2 Mobile Caveats**:
   - Test safe-area insets (`env(safe-area-inset-*)`), virtual keyboard viewport resizing, and offline state recovery. If a feature requires continuous background execution or low-latency native sensors, escalate to `ios-native` / `android-native` per `ADR-0002`.

---

## 3. Native iOS (`SwiftUI`) & Native Android (`Jetpack Compose`) Rules

1. **Zero Hand-Written API DTOs (`ADR-0003`)**:
   - Never waste context tokens hand-writing JSON models or HTTP client boilerplate in Swift or Kotlin.
   - Generate typed clients directly from `contracts/openapi.yaml` (`swift-openapi-generator` on iOS; `openapi-generator-cli -g kotlin` on Android).
2. **Unidirectional Data Flow (MVVM / MVI)**:
   - **iOS (`ios/`)**: `@Observable` ViewModels (`@MainActor`) + pure `SwiftUI` Views + protocol-backed repository dependencies for deterministic `Swift Testing` / `XCTest` unit tests.
   - **Android (`android/`)**: `ViewModel` exposing immutable `StateFlow<UiState>` + stateless `@Composable` screens + Kotlin Coroutines/Flow tested via `kotlinx-coroutines-test`.
3. **Shared Error Handling**:
   - Decode RFC 9457 `application/problem+json` responses into a unified native `ProblemDetails` model so iOS, Android, Web, and Desktop present identical validation and domain error messages.

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# Desktop / Mobile Tauri v2 (Rust core checks)
cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings && cargo test

# Native iOS (when ios-native is enabled)
cd ios && swift test

# Native Android (when android-native is enabled)
cd android && ./gradlew testDebugUnitTest lintDebug
```
