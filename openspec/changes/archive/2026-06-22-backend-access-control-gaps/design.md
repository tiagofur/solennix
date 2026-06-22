# Design: Backend Access Control Gaps

## Technical Approach

To close access control vulnerabilities across OAuth authentication, public payments, and reviews, we will implement the following:

1. **OAuth Account Status Gate**: Refactor `AuthHandler` to allow mocking of token validation functions (`validateGoogleIDToken` and `validateAppleIDToken`) using function fields in the struct. Add comprehensive unit tests in `auth_handler_test.go` targeting blocked/deleted account rejections (HTTP 403) and deletion grace-period cancellations (status set back to active, deletion canceled).
2. **Fail-Closed Public Payments**: Modify `CreatePublic` and `GetHistoryPublic` in `payment_submission_handler.go` to reject requests with `403 Forbidden` immediately if the event lookup (`h.lookupEvent`) fails or returns a nil event. Ensure the `client_id` check is never bypassed.
3. **Tenant Isolation for Reviews**: Create `event_review_handler_test.go` to verify that organizers cannot update review responses or visibility for reviews they do not own (yielding `403 Forbidden`).

---

## Architecture Decisions

| Decision | Options Considered | Tradeoffs | Selected Choice & Rationale |
|----------|--------------------|-----------|-----------------------------|
| **Mocking OAuth Token Verification** | 1. Interface-based mock<br>2. Function fields in struct | 1. Requires defining interface & wrapping functions.<br>2. Direct, lightweight, matches existing `passwordBreachCheck` pattern. | **Option 2: Function fields in struct**.<br>Keeps codebase consistent and avoids unnecessary boilerplate. |
| **Fail-Closed Lookup Enforcement** | 1. Optional checks with default bypass<br>2. Strict error rejection (fail-closed) | 1. Simple but allows bypass on DB error.<br>2. Rejects request if auth state is ambiguous. | **Option 2: Strict error rejection**.<br>Ensures maximum security on public endpoints. |

---

## Data Flow

### Public Payment Client Verification Flow

```
Public Request (client_id, event_id, token)
       │
       ▼
Validate Public Link (token)
       │ (Pass)
       ▼
Lookup Event (event_id) ─────────► [Error / Nil] ──► Return 403 Forbidden (Fail-Closed)
       │ (Success)
       ▼
Check Client Match (event.ClientID == client_id) ───► [No Match] ──► Return 403 Forbidden
       │ (Match)
       ▼
Proceed with Payment / Fetch History
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/internal/handlers/auth_handler.go` | Modify | Define custom func types for token validation and add them to `AuthHandler` to facilitate testing. |
| `backend/internal/handlers/auth_handler_test.go` | Modify | Implement unit tests for Google and Apple OAuth logins verifying blocked, deleted, and grace-period accounts. |
| `backend/internal/handlers/payment_submission_handler.go` | Modify | Adjust `CreatePublic` and `GetHistoryPublic` to enforce fail-closed verification of event and client ID. |
| `backend/internal/handlers/payment_submission_handler_test.go` | Modify | Add and verify unit/integration tests for fail-closed payment submissions and history. |
| `backend/internal/handlers/event_review_handler_test.go` | Create | Unit tests verifying that unauthorized tenants cannot update review replies or visibility (asserting 403). |

---

## Interfaces / Contracts

We will add the following function types and fields in `backend/internal/handlers/auth_handler.go`:

```go
type validateGoogleTokenFunc func(ctx context.Context, idToken string, allowedClientIDs []string) (*GoogleIDTokenClaims, error)
type validateAppleTokenFunc func(identityToken string, allowedClientIDs []string) (*AppleIDTokenClaims, error)

type AuthHandler struct {
	userRepo            FullUserRepository
	authService         *services.AuthService
	emailService        *services.EmailService
	cfg                 *config.Config
	refreshTokenRepo    RefreshTokenRepository
	passwordBreachCheck passwordBreachCheckFunc
	validateGoogleToken validateGoogleTokenFunc
	validateAppleToken  validateAppleTokenFunc
}
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | OAuth Account Status Gate | Mock validation functions inside `AuthHandler` and mock `userRepo` to simulate blocked, deleted, and grace-period accounts, asserting correct HTTP status codes (403 or 200) and db updates. |
| Unit | Tenant Isolation on Reviews | Test `UpdateOrganizerResponse` and `UpdateReviewVisibility` in a new `event_review_handler_test.go` with mismatching `userID` inside context. |
| Integration | Public Payments Fail-Closed | Run integration tests using `httptest` where `lookupEvent` mock returns errors or mismatched client IDs. |

---

## Migration / Rollout

No migration required. No changes to DB schemas or external APIs.

---

## Open Questions

None.
