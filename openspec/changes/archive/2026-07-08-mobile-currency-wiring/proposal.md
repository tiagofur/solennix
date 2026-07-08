# Proposal: Mobile Currency Wiring

## Intent & Scope
Wire dynamic currency formatting across iOS and Android mobile clients using backend-supplied currency codes instead of hardcoded MXN formatting.

*   **In Scope:**
    *   Add `defaultCurrency` to iOS and Android `User` models.
    *   Add `currency` to iOS and Android `Event` models.
    *   Update iOS/Android UI views and view models to inject currency codes dynamically.
*   **Out of Scope:**
    *   Backend or database schema changes.
    *   Updating OpenAPI specifications.

## Approach: Call-Site Dependency Injection
Pass currency codes (`event.currency` or `user.defaultCurrency`) directly into existing formatting helpers (`formattedCurrency(code:)` on iOS, `asCurrency(currencyCode)` on Android) at formatting call sites.
*   **Pros:** Supports multi-currency views; clean unidirectional data flow; no global mutable state; easy testing.
*   **Cons:** Requires updating multiple UI formatting call sites.

## Affected Areas

| Platform | File / Path | Action / Change |
| :--- | :--- | :--- |
| **iOS** | `SolennixCore/.../User.swift` | Add `defaultCurrency: String?` |
| **iOS** | `SolennixCore/.../Event.swift` | Add `currency: String?` with default value |
| **iOS** | iOS Views (e.g., `EventDetailView.swift`) | Replace `.asMXN` with `.formattedCurrency(code: ...)` |
| **Android** | `core/model/.../User.kt` | Add `@SerialName("default_currency") defaultCurrency: String?` |
| **Android** | `core/model/.../Event.kt` | Add `@SerialName("currency") currency: String?` |
| **Android** | Android Compose Screens | Replace `.asMXN()` with `.asCurrency(currencyCode)` |

## Risks & Mitigation

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Model initialization breakages in tests | High | Use default values (`nil` / `"MXN"`) in model initializers. |
| Missing/null currency defaults in API | Medium | Fall back to `"MXN"` if currency is not supplied. |

## Rollback Plan
Revert changes using Git:
```bash
git checkout main -- ios/ Packages/ android/
```

## Success Criteria
1. Financial fields format dynamically based on API-returned currency (e.g. USD, MXN, COP).
2. Existing test suites for iOS and Android build and pass without regressions.
