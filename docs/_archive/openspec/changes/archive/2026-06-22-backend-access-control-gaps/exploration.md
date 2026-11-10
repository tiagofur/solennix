## Exploration: Resolve Access Control Gaps in Backend (OAuth, Public Portal, Reviews, Presign)

### Current State
The backend implements access control checks across various handlers, but several gaps and improvement areas exist:
1. **OAuth (C5)**: The helper `checkAccountAccess` is used in `GoogleSignIn`, `AppleSignIn`, and `AppleCallback` to block blocked/deleted users and restore pending deletion accounts during the grace period. While the logic is defined, there is a lack of unit/integration tests confirming these endpoints correctly trigger the helper and enforce the blocks.
2. **Payment Submission Client Matching (M15)**: In `CreatePublic` and `GetHistoryPublic` within `payment_submission_handler.go`, client verification is performed via `h.lookupEvent`. If `h.lookupEvent` fails or returns an error, the checks are bypassed, which allows arbitrary clients to submit payments or view history.
3. **Review Updates Tenant Isolation (M2)**: The update operations in `event_review_repo.go` (`MarkRequestSubmitted`, `UpdateOrganizerReply`, and `UpdateVisibility`) correctly filter by `user_id` in SQL, but there are zero handler or repository tests validating this behavior.
4. **Presign Key Derivation (A11)**: The server initialization in `main.go` correctly derives the S3 presigned URL signing key from `cfg.JWTSecret` using HMAC-SHA256, separating cryptographic domains. No raw JWT secret exposure was found in presign token signatures.

### Affected Areas
- `backend/internal/handlers/payment_submission_handler.go` — Refactor public payment creation and history to strictly validate `client_id` and fail-closed if event retrieval fails.
- `backend/internal/handlers/payment_submission_handler_test.go` — Add test cases for fail-closed behavior on event lookup errors.
- `backend/internal/handlers/auth_handler_test.go` — Add unit tests validating that OAuth sign-in endpoints block `blocked`/`deleted` accounts and correctly restore accounts in the grace period.
- `backend/internal/handlers/event_review_handler_test.go` — [NEW] Create unit tests for review operations to verify tenant isolation and access control on updates.

### Approaches
1. **Approach 1: Safe Event Lookup & Integration Testing**
   - Refactor `CreatePublic` and `GetHistoryPublic` to load events from the repository or mock, ensuring any lookup error or nil event results in a `403 Forbidden` response instead of bypassing the check.
   - Implement unit tests for the OAuth handlers and Apple/Google sign-in endpoints using mocked repositories to assert they correctly block and restore accounts.
   - Create `event_review_handler_test.go` to test all review visibility and organizer response endpoints, asserting that unauthorized users receive `403 Forbidden`.
   - Pros: Highly secure, fail-closed, does not modify OpenAPI schemas, includes regression tests.
   - Cons: Slightly higher test code footprint.
   - Effort: Medium

### Recommendation
Use Approach 1. Refactoring the payment submission endpoints to fail-closed on event lookup errors is crucial for security. Adding robust unit/integration tests for OAuth endpoints and reviews ensures no future regressions bypass access control gates.

### Risks
- **Test environment mock setup**: Mocks for OAuth tokens and public link lookups must be set up properly to run tests without network calls.

### Ready for Proposal
Yes
