# Currency Specification

## Purpose

Define the requirements for dynamic, multi-currency support in Solennix, allowing users to run their business and display their financials in their local currency.

## Requirements

### Requirement: Default Currency Storage and Fallback
The backend MUST store a `default_currency` field in the user profile and an event-level `currency` field. If not specified, they MUST fall back to `"MXN"`.

#### Scenario: Existing User Fallback
- GIVEN a user registered before dynamic currency was introduced
- WHEN retrieving their profile or events
- THEN the system MUST return `"MXN"` as the currency
- AND format all values as Mexican Pesos.

#### Scenario: User Profile Update
- GIVEN an authenticated user
- WHEN they update their profile settings with a new `default_currency` (e.g., `"COP"`)
- THEN the system MUST store the new value
- AND all subsequent events created by this user MUST default to `"COP"`.

### Requirement: Automatic Onboarding Detection
Upon first launch / registration, the applications SHOULD detect the system default currency and suggest it.

#### Scenario: First Launch Suggestion
- GIVEN a new user whose device region is Colombia
- WHEN opening the sign-up or profile setup screen
- THEN the application MUST show Colombian Peso (`"COP"`) as the pre-selected currency suggestion.

### Requirement: Dynamic UI Currency Formatting
Client applications (Web, iOS, Android) and backend PDF generators MUST format all financial figures dynamically based on the active currency code and the user's formatting locale.

#### Scenario: Dynamic Web Invoice
- GIVEN an event with total `1500` and currency `"USD"`
- WHEN viewed in the Client Portal on Web
- THEN the application MUST display the total formatted as `$1,500.00` (or equivalent based on viewer locale) and denote the currency code if different from the default.
