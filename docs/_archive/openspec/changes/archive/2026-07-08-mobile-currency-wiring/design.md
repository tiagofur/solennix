# Technical Design: Mobile Currency Wiring

This document specifies the technical design for wiring dynamic currency formatting across iOS (SwiftUI) and Android (Jetpack Compose) mobile clients using backend-supplied currency codes instead of hardcoded MXN formatting.

---

## 1. Data Flow

The following ASCII diagram illustrates the unidirectional data flow of the currency code from the backend API response payload, through the decoded model layers, to the formatting extensions and the final view rendering:

```
[ Backend API Payload ]
  │ (e.g., "currency": "USD" or null)
  ▼
[ JSON Decoder / Deserialization ]
  │ (Fallback handling: defaults null/missing to "MXN")
  ▼
[ Domain Model Layer ]
  ├─ iOS: Event.currency / User.defaultCurrency
  └─ Android: Event.currency / User.defaultCurrency
  ▼
[ UI State / ViewModel Injection ]
  │ (Passes currency code to formatting call sites)
  ▼
[ Currency Formatting Extensions ]
  ├─ iOS: formattedCurrency(code:)
  └─ Android: asCurrency(currencyCode)
  ▼
[ View Layer (SwiftUI / Compose) ]
  └─ Rendered Output (e.g., "$1,234.56 USD")
```

---

## 2. Design Decisions

### Decision 1: Where to default the currency when it is null/empty in the JSON payloads

We must determine where to apply the default fallback currency (`"MXN"`) when the backend payload does not supply a currency code.

| Option | Description | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Model Decoder/Init Level** | Apply default directly during JSON decoding or in the constructor default values. | Model guarantees a non-null, valid currency; call sites remain clean. | Customized decoders/constructors might be required if the backend explicitly sends `null` instead of omitting the key. | **Selected**. Standardizes model safety at the boundary of the app. |
| **B. Formatting Extension Fallback** | Keep fields optional on models and default them to `"MXN"` inside formatting helpers. | Simpler model declarations; matches existing extension signature (`code: String? = nil`). | Scatters defaulting assumptions; model representation is less deterministic. | Alternate fallback. |

*Implementation Detail:*
- **iOS (`Event.swift` & `User.swift`)**: The properties are declared as optional `String?` for Decodable compatibility but will have a computed convenience property `currencyCode` (or similar) or decoder defaults returning `"MXN"` if the underlying field is nil.
- **Android (`Event.kt` & `User.kt`)**: Map using `@SerialName("currency") val currency: String? = null` and expose a helper getter `val currencyCode: String get() = currency ?: "MXN"`.

---

### Decision 2: How to access the user's default currency in dashboard/stats/aggregated views

We must determine how components that display aggregated values access the logged-in user's `defaultCurrency`.

| Option | Description | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **A. ViewModel State Injection** | Fetch user from AuthManager inside ViewModels and expose it explicitly in UI State. | Decouples Views from global session Managers; preview-friendly. | Slightly more boilerplate to pass down variables. | **Selected**. Aligns with clean architecture and unidirectional data flow. |
| **B. Global Session Singleton** | Read directly from `AuthManager.shared.currentUser` or equivalent global context. | Minimal code change in deep nested views. | Couples views to authentication state; makes SwiftUI/Compose Previews difficult. | Not recommended. |
| **C. Ambient Context / CompositionLocal** | Store in environment or CompositionLocal context (e.g. `LocalUserCurrency`). | Clean views; no prop drilling. | Hidden dependency; easy to forget context setup in testing/previews. | Not recommended for core logic. |

---

## 3. Affected Components & File Changes

The exact paths for the model definitions and the target files requiring call-site formatting updates are outlined below.

### 3.1 Model Paths

- **iOS User Model**: `ios/Packages/SolennixCore/Sources/SolennixCore/Models/User.swift`
- **iOS Event Model**: `ios/Packages/SolennixCore/Sources/SolennixCore/Models/Event.swift`
- **Android User Model**: `android/core/model/src/main/java/com/creapolis/solennix/core/model/User.kt`
- **Android Event Model**: `android/core/model/src/main/java/com/creapolis/solennix/core/model/Event.kt`

### 3.2 View & ViewModel Call Sites (Replacing `.asMXN` / `.asMXN()`)

#### iOS Call Sites (SwiftUI)
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift`
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/QuickQuoteView.swift`
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/ViewModels/EventListViewModel.swift`
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventContractPreviewView.swift`
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift`
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventExtrasDetailView.swift`
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFinancesDetailView.swift`
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventPaymentsDetailView.swift`

#### Android Call Sites (Jetpack Compose)
- `android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/ClientDetailScreen.kt`
- `android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/ClientListScreen.kt`
- `android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/QuickQuoteScreen.kt`
- `android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/viewmodel/ClientListViewModel.kt`
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt`
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/ForecastWidget.kt`
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/ProductDemandWidget.kt`
- `android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/TopClientsWidget.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventChecklistScreen.kt`
- `android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailCatalogSubScreens.kt`

---
