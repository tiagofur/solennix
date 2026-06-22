# Proposal: Resolve Access Control Gaps in Backend

## Intent
Close access control vulnerabilities in OAuth authentication (Google/Apple), public payment submission validation, and event review updates.

## Scope

### In Scope
- OAuth Status Enforcements: Ensure Google/Apple OAuth sign-in paths block `blocked` and `deleted` users and cancel pending self-deletions for accounts in the grace period.
- Payment Portal Client Verification: Refactor `CreatePublic` and `GetHistoryPublic` endpoints to perform fail-closed validation of `client_id` against the event's `ClientID`.
- Review Isolation: Write integration tests to verify reviews can only be updated by the authenticated organizer.
- Presign Secret Check: Validate S3 presign key derivation via HMAC-SHA256 to separate domain secrets.

### Out of Scope
- Modifying OpenAPI spec contract (`openapi.yaml`).
- Frontend/UI changes or updates to mobile apps.

## Approach
- Modify `payment_submission_handler.go` to validate `client_id` by looking up the event. If the event lookup fails or returns `nil`, return `403 Forbidden` (fail-closed) instead of bypassing the check.
- Write unit tests in `auth_handler_test.go` verifying blocked/deleted OAuth account rejections and grace-period cancellations.
- Write a new test file `event_review_handler_test.go` verifying that `UpdateOrganizerResponse` and `UpdateReviewVisibility` reject requests from unauthorized tenants with `403 Forbidden`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/handlers/payment_submission_handler.go` | Modified | Add fail-closed client matching logic |
| `backend/internal/handlers/payment_submission_handler_test.go` | Modified | Test cases for mismatched/missing clients |
| `backend/internal/handlers/auth_handler_test.go` | Modified | Mock OAuth status gate test cases |
| `backend/internal/handlers/event_review_handler_test.go` | New | Access control & tenant isolation tests for reviews |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Database query timeouts in public routes | Low | Add index on `events.client_id` (already indexed) and set short context timeout |

## Rollback Plan
Revert code changes using Git: `git checkout main -- backend/internal/handlers/`

## Success Criteria
- [ ] Blocked/deleted OAuth sign-ins fail with `403 Forbidden`.
- [ ] Users in grace period login via OAuth and have their self-deletion request cancelled.
- [ ] Payment submission public endpoints fail with `403 Forbidden` when `client_id` does not match the event's client, or when the event does not exist.
- [ ] Organizer reviews cannot be updated by other user sessions (asserting `403 Forbidden`).
