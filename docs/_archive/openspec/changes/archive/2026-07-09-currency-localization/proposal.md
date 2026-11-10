# Proposal: Dynamic Currency Localization

## Intent

Enable organizers to configure their local business currency (e.g., MXN, COP, USD) instead of hardcoding MXN, ensuring correct financial calculations, formatting, and client-facing portal display.

## Scope

### In Scope
- Add `default_currency` field (VARCHAR(3), defaulted to `'MXN'`) to the `users` table.
- Retrieve system locale currency at onboarding/registration as a recommendation.
- Add profile settings section to allow organizers to view and update their business currency.
- Expose the currency field in events and client portal API endpoints.
- Update UI currency formatters across Web, iOS, Android, and Backend (Go PDF generation) to use the dynamic currency.

### Out of Scope
- Automatic currency conversion or live exchange rate integration.
- Multiple currencies within a single event (each event uses the organizer's active currency).
- Multi-currency payment provider routing (e.g., configuring different Stripe keys per currency).

## Approach

We will introduce a database migration to add `default_currency` in the `users` model, ensuring backward compatibility with a fallback to `"MXN"`. The backend will pass the currency code in API responses. The client applications will replace hardcoded formatting with native locale-aware formatters that accept the dynamic currency code.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/models/models.go` | Modified | Add `DefaultCurrency` to `User` struct. |
| `backend/internal/pdf/template_tokens.go` | Modified | Update `FormatCurrency` to use dynamic code. |
| `web/src/lib/finance.ts` | Modified | Update `formatCurrency` to use profile/event currency. |
| `ios/Packages/SolennixCore/Sources/SolennixCore/Extensions/CurrencyFormatting.swift` | Modified | Use Swift currency formatter with dynamic code. |
| `android/core/utils/CurrencyFormatting.kt` | New | Create dynamic currency utility. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing currency value in older versions | Med | Backend and frontend fallback to `"MXN"`. |
| Broken calculations due to floating-point differences | Low | Formatting remains purely presentation-layer; values are stored in cents/integers. |

## Rollback Plan

Revert the database schema changes (or keep the column if safe) and revert the client formatters to the hardcoded MXN behavior.

## Dependencies

- None.

## Success Criteria

- Existing data continues to show MXN.
- Selecting a different currency (e.g. USD) updates all dashboards, events, and PDFs to reflect USD symbols and codes.
- New user registration auto-suggests currency based on locale.
