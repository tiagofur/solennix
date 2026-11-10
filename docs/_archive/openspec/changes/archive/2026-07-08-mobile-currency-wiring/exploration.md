# Exploration: mobile-currency-wiring

> Investigate the codebase, analyze how currency is currently formatted and represented, and determine the changes required to wire dynamic currency formatting based on the backend-supplied currency code across iOS and Android mobile clients.

---

## Current State

### iOS (SwiftUI / SolennixCore / SolennixFeatures)

**1. Currency Formatting Extensions (`ios/Packages/SolennixCore/Sources/SolennixCore/Extensions/CurrencyFormatting.swift`)**
- `Double` and `Decimal` types have the hardcoded property `.asMXN` which formats values using `es_MX` locale rules and appends the `" MXN"` suffix (e.g., `"$1,234.56 MXN"`).
- Both types already have a dynamic method `formattedCurrency(code: String?) -> String`. This helper defaults to `"MXN"`. If the code matches `"MXN"`, it uses the standard Mexican Peso formatting; otherwise, it dynamically applies the provided ISO 4217 code using locale-specific rules and appends the code to the formatted string (e.g., `"$1,234.56 COP"`).

**2. Model Definitions (`ios/Packages/SolennixCore/Sources/SolennixCore/Models/`)**
- **`Event.swift`**: Lacks the `currency` property. Currently, there is no field to capture the currency code from the backend API.
- **`User.swift`**: Lacks the `defaultCurrency` property (which translates from backend `default_currency`).
- *Note:* The APIClient is configured with `keyDecodingStrategy = .convertFromSnakeCase`, so `default_currency` in backend JSON maps directly to `defaultCurrency` in Swift camelCase.

**3. UI References**
- Views use `.asMXN` or `DashboardFormatting.currencyMXN` extensively (e.g., `ClientDetailView.swift`, `QuickQuoteView.swift`, `EventDetailView.swift`, `EventFinancesDetailView.swift`, `EventPaymentsDetailView.swift`, `DashboardView.swift`). These references are hardcoded and ignore the specific currency metadata of the event or user.

---

### Android (Jetpack Compose / core:model / core:data)

**1. Currency Formatting Extensions (`android/core/model/src/main/java/com/creapolis/solennix/core/model/extensions/CurrencyFormatting.kt`)**
- `Double` has `.asMXN()` and `.asMXNCompact()` to format numbers into Mexican Peso format.
- It also has dynamic extensions `Double.asCurrency(currencyCode: String?): String` and `Double.asCurrencyCompact(currencyCode: String?): String` which accept an optional currency code, validate it with `java.util.Currency.getInstance(currency)`, and append the currency code suffix if it differs from `"MXN"`.

**2. Model Definitions (`android/core/model/src/main/java/com/creapolis/solennix/core/model/`)**
- **`Event.kt`**: Lacks the `currency` property.
- **`User.kt`**: Lacks the `defaultCurrency` property.
- *Note:* In Kotlin, models use Kotlinx Serialization, requiring explicit `@SerialName` annotations for snake_case properties like `@SerialName("default_currency") val defaultCurrency: String? = null` and `@SerialName("currency") val currency: String? = null`.

**3. UI References**
- Screens like `ClientDetailScreen.kt`, `QuickQuoteScreen.kt`, `DashboardScreen.kt`, `ForecastWidget.kt`, and `EventChecklistScreen.kt` use `.asMXN()` or `.asMXNCompact()` to format financial values.

---

### OpenAPI & Backend (Go / Chi / openapi.yaml)

**1. OpenAPI Spec (`backend/docs/openapi.yaml`)**
- Already specifies the currency fields in the models:
  - `User` schema has `default_currency` (type `string`, default `"MXN"`).
  - `Event` schema has `currency` (type `string`, default `"MXN"`).
  - `EventUpsertRequest` has `currency` (type `string`, nullable `true`).
  - `PublicPaymentSummary` has `currency` (type `string`).
- The contract is frozen and fully documented.

**2. Backend Support**
- The database migration `061_add_currency.up.sql` added the fields to the schema.
- Go structs (`models.User`, `models.Event`) have the corresponding `default_currency` and `currency` fields.
- Endpoints like `PUT /api/users/me` and `POST /api/events` already process, validate, and store these values. If an event is created without an explicit currency, it defaults to the user's `default_currency` (or `"MXN"` if that is also empty).
- `LanguageReporter` on mobile platforms successfully reports the preferred language and default currency based on the system locale during checkout or profile check-in.

---

## Affected Areas

### iOS
- **`ios/Packages/SolennixCore/Sources/SolennixCore/Models/User.swift`**: Add `public var defaultCurrency: String?` to the `User` struct.
- **`ios/Packages/SolennixCore/Sources/SolennixCore/Models/Event.swift`**: Add `public let currency: String?` to the `Event` struct and update the initializer, ensuring it has a default value (`= nil` or `= "MXN"`) to preserve backward compatibility with existing tests.
- **iOS Views**: Update view calls to use `formattedCurrency(code: ...)` instead of `.asMXN` or `currencyMXN`.
  - For individual event screens (e.g., `EventDetailView.swift`, `EventFinancesDetailView.swift`, `EventPaymentsDetailView.swift`, `EventContractPreviewView.swift`, `QuickQuoteView.swift`): pass `event.currency`.
  - For user/dashboard/aggregated statistics screens (e.g., `DashboardView.swift`, `DashboardFormatting.swift`, `ClientDetailView.swift`): pass `currentUser.defaultCurrency` (loaded from `AuthManager.currentUser`).

### Android
- **`android/core/model/src/main/java/com/creapolis/solennix/core/model/User.kt`**: Add `@SerialName("default_currency") val defaultCurrency: String? = null` to the `User` data class.
- **`android/core/model/src/main/java/com/creapolis/solennix/core/model/Event.kt`**: Add `@SerialName("currency") val currency: String? = null` to the `Event` data class.
- **Android UI Screens**: Update Compose elements and view models to pass the event's `currency` or the logged-in user's `defaultCurrency` to `asCurrency(currencyCode)` and `asCurrencyCompact(currencyCode)`.

### OpenAPI / Backend
- **None**: The OpenAPI spec and Go backend are already aligned, tested, and correct. No changes are required.

---

## Approaches

### Approach 1: Call-Site Dependency Injection (Recommended)
Pass the currency code (either from `event.currency` or `user.defaultCurrency`) directly to the existing formatting helpers (`formattedCurrency(code:)` on iOS, `asCurrency(currencyCode)` on Android) at every call site.

- **Pros:**
  - Highly robust: handles multi-currency accounts naturally (e.g., an organizer managing a USD event and a MXN event simultaneously).
  - Explicit and aligned with SwiftUI / Compose Unidirectional Data Flow (UDF) best practices.
  - Zero global state mutation; easy to test.
- **Cons:**
  - Requires updating multiple call sites in Views and ViewModels that currently invoke parameterless `.asMXN` properties/methods.

### Approach 2: Ambient Currency Provider / Global Configuration
Establish a global currency context (e.g., inside `AuthManager` or a shared `CurrencyProvider`) that is set when the user logs in. The existing `.asMXN` extensions (or a new parameterless extension like `.asLocalCurrency`) can retrieve the active currency code from this global provider.

- **Pros:**
  - Fewer modifications to view call sites.
- **Cons:**
  - Fails to support multi-currency views (e.g., if an event's currency differs from the user's default).
  - Introduces global mutable state and coupling between core extension models and network/auth layers.
  - Harder to test and debug.

---

## Recommendations

Implement **Approach 1 (Call-Site Dependency Injection)**. 
- The backend already stores currency code at the event level (`event.currency`) to handle multi-currency situations.
- Using direct invocation of `formattedCurrency(code:)` and `asCurrency(currencyCode)` ensures correct rendering of distinct currencies when viewed in the same dashboard, report, or list.
- Fallbacks to `"MXN"` should be specified at all formatting call sites when the model's currency properties are `nil`.
- Ensure constructors/initializers of the `Event` model have default values for the new `currency` field to prevent breakage of the extensive unit test suite.
