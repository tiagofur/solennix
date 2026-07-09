# Design: Dynamic Currency Localization

## Technical Approach

We will store `default_currency` in the `users` table and `currency` in the `events` table (copying it on creation). The API handlers will read and write these fields. On client apps, we will replace hardcoded formatting with native locale-aware formatters.

## Architecture Decisions

### Decision: Database Schema Design

**Choice**: Add `default_currency` to `users` and `currency` to `events` (both `VARCHAR(3) DEFAULT 'MXN'`).
**Alternatives considered**: Creating a separate settings table.
**Rationale**: A separate table introduces database join overhead for a profile-level setting. Adding fields to existing tables is simpler and standard in this codebase.

### Decision: Client-Side Formatting Locale

**Choice**: Format currency using the user's device locale but overriding the currency code (e.g., `amount.formatted(.currency(code: userCurrency))`).
**Alternatives considered**: Forcing a single locale (like `es-MX`) for all users.
**Rationale**: Native mobile platforms (Swift/Kotlin) and Web (`Intl.NumberFormat`) automatically adapt to the user's number formatting conventions (points vs commas) based on their locale, while displaying the correct currency symbol.

## Data Flow

```
User Profile / Event Creation ──→ DB (users.default_currency, events.currency)
                                             │
                                             ▼
Client Apps / PDF Generators ⟵─── API Serializer (JSON response)
     │
     ▼
Native Localized Formatters (Intl.NumberFormat / Swift formatted() / Java NumberFormat)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/internal/database/migrations/..._add_currency.sql` | Create | Database migration adding the columns. |
| `backend/internal/models/models.go` | Modify | Add fields to `User` and `Event` structs. |
| `backend/internal/pdf/template_tokens.go` | Modify | Update `FormatCurrency` signature to accept dynamic currency code. |
| `web/src/lib/finance.ts` | Modify | Update `formatCurrency` to read dynamic currency. |
| `ios/Packages/SolennixCore/Sources/SolennixCore/Extensions/CurrencyFormatting.swift` | Modify | Update formatting functions to accept `currencyCode`. |
| `android/core/utils/CurrencyFormatting.kt` | Create | New Kotlin utility for Compose format. |

## Interfaces / Contracts

### API Change (User Response):
```json
{
  "id": "uuid",
  "email": "user@email.com",
  "preferred_language": "es",
  "default_currency": "COP"
}
```

### API Change (Event Response):
```json
{
  "id": "uuid",
  "title": "My Event",
  "total_amount": 15000.0,
  "currency": "COP"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Backend) | `FormatCurrency` with different codes | Test that `FormatCurrency(1500, "USD")` outputs correct format |
| Unit (Web) | `formatCurrency` TS helper | Verify correct decimal / thousand formatting for COP, USD, MXN |
| Integration (Backend) | User profile update & Event creation | Assert that updating `default_currency` sets `currency` on new events |

## Migration / Rollout

A database migration will run automatically on deploy. Sane defaults (`'MXN'`) are set at the database level to prevent null issues for existing users.
