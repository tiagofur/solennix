# Tasks: Mobile Currency Wiring

This document defines the task breakdown to wire dynamic currency formatting across iOS and Android mobile clients.

## Phase 1: iOS Foundation

- [x] Modify `User.swift` ([User.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixCore/Sources/SolennixCore/Models/User.swift)):
  - Add `public var defaultCurrency: String?` property.
- [x] Modify `Event.swift` ([Event.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixCore/Sources/SolennixCore/Models/Event.swift)):
  - Add `public var currency: String?` property.
  - Update custom `init` to support `currency: String? = nil`.
- [x] Update iOS mock data / test fixtures:
  - Add default currency values to `Event` and `User` initialization in mock helpers and test setups.

## Phase 2: iOS UI Wiring

- [x] Update SwiftUI View files to replace `.asMXN` with `.formattedCurrency(code: ...)`:
  - [ClientDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift) - Inject user/client default currency.
  - [QuickQuoteView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/QuickQuoteView.swift) - Inject currency code.
  - [EventListViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/ViewModels/EventListViewModel.swift) - Pass event currency to state.
  - [EventContractPreviewView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventContractPreviewView.swift) - Use event's currency.
  - [EventDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift) - Use event's currency.
  - [EventExtrasDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventExtrasDetailView.swift) - Use event's currency.
  - [EventFinancesDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFinancesDetailView.swift) - Use event's currency.
  - [EventPaymentsDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventPaymentsDetailView.swift) - Use event's currency.

## Phase 3: Android Foundation

- [x] Modify `User.kt` ([User.kt](file:///Users/tiagofur/dev/solennix/android/core/model/src/main/java/com/creapolis/solennix/core/model/User.kt)):
  - Add `@SerialName("default_currency") val defaultCurrency: String? = null`.
- [x] Modify `Event.kt` ([Event.kt](file:///Users/tiagofur/dev/solennix/android/core/model/src/main/java/com/creapolis/solennix/core/model/Event.kt)):
  - Add `@SerialName("currency") val currency: String? = null`.
- [x] Update Android mock data / test fixtures:
  - Add default currency values to `Event` and `User` initialization in mock helpers.

## Phase 4: Android UI Wiring

- [x] Update Compose Screen/ViewModel files to replace `.asMXN()` with `.asCurrency(currencyCode)`:
  - [ClientDetailScreen.kt](file:///Users/tiagofur/dev/solennix/android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/ClientDetailScreen.kt)
  - [ClientListScreen.kt](file:///Users/tiagofur/dev/solennix/android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/ClientListScreen.kt)
  - [QuickQuoteScreen.kt](file:///Users/tiagofur/dev/solennix/android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/ui/QuickQuoteScreen.kt)
  - [ClientListViewModel.kt](file:///Users/tiagofur/dev/solennix/android/feature/clients/src/main/java/com/creapolis/solennix/feature/clients/viewmodel/ClientListViewModel.kt)
  - [DashboardScreen.kt](file:///Users/tiagofur/dev/solennix/android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/DashboardScreen.kt)
  - [ForecastWidget.kt](file:///Users/tiagofur/dev/solennix/android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/ForecastWidget.kt)
  - [ProductDemandWidget.kt](file:///Users/tiagofur/dev/solennix/android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/ProductDemandWidget.kt)
  - [TopClientsWidget.kt](file:///Users/tiagofur/dev/solennix/android/feature/dashboard/src/main/java/com/creapolis/solennix/feature/dashboard/ui/TopClientsWidget.kt)
  - [EventChecklistScreen.kt](file:///Users/tiagofur/dev/solennix/android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventChecklistScreen.kt)
  - [EventDetailCatalogSubScreens.kt](file:///Users/tiagofur/dev/solennix/android/feature/events/src/main/java/com/creapolis/solennix/feature/events/ui/EventDetailCatalogSubScreens.kt)

## Phase 5: Verification

- [x] Run iOS unit tests:
  - Run all model and view model unit tests via CLI or Xcode.
- [x] Run Android unit and serialization tests:
  - Run `./gradlew test` to ensure model tests compile and pass.
- [x] Manually verify formatting on-device/emulators:
  - Verify display of currency codes (e.g. COP, USD, MXN) in details and dashboard views.
