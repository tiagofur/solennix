# Tasks: Dynamic Currency Localization

## Phase 1: Database & Backend (Go)

- [x] 1.1 Create SQL migration file adding `default_currency` to `users` and `currency` to `events` (defaulting both to `'MXN'`).
- [x] 1.2 Update `User` and `Event` struct definitions in `backend/internal/models/models.go` to include the new fields.
- [x] 1.3 Update the user profile update and signup handlers to save the currency setting.
- [x] 1.4 Update the event creation repository/service layer to populate `event.currency` from the user's `default_currency`.
- [x] 1.5 Modify `FormatCurrency` in `backend/internal/pdf/template_tokens.go` to parse and append the dynamic currency code.

## Phase 2: Web Implementation (React)

- [x] 2.1 Update `formatCurrency` in `web/src/lib/finance.ts` to accept dynamic `currencyCode` and use it in `Intl.NumberFormat`.
- [x] 2.2 Add a currency dropdown selector in the profile settings page (`web/src/pages/Settings/ProfileSettings.tsx` or equivalent).
- [x] 2.3 Wire the client-side event views and portal pages to pass the event's `currency` to formatting helpers.

## Phase 3: Mobile Apps (iOS & Android)

- [x] 3.1 Update `CurrencyFormatting.swift` in iOS `SolennixCore` to format double/decimal values with dynamic codes.
- [x] 3.2 Add automatic system locale currency suggestion on the sign-up flow in `LanguageReporter.swift` / registration view.
- [x] 3.3 Create Kotlin formatter utility `CurrencyFormatting.kt` in Android `core` module and implement dynamic formatting in event list/detail screens.

## Phase 4: Testing & Verification

- [x] 4.1 Write Go unit tests in `template_tokens_test.go` verifying dynamic currency formatting (e.g., USD, COP).
- [x] 4.2 Write React unit tests verifying the dynamic currency formatting behavior of `formatCurrency`.
- [ ] 4.3 Manually verify that setting a profile currency updates invoices, client portal links, and dashboard metrics.

## Phase 5: Documentation

- [ ] 5.1 Update the product status documentation in `docs/PRD/11_CURRENT_STATUS.md`.
