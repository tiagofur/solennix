# Tasks: Backend Access Control Gaps

## Phase 1: Foundation (OAuth Mocking Setup)

- [x] 1.1 Define func types `validateGoogleTokenFunc` and `validateAppleTokenFunc` in `backend/internal/handlers/auth_handler.go`.
- [x] 1.2 Add `validateGoogleToken` and `validateAppleToken` fields to `AuthHandler` struct in `backend/internal/handlers/auth_handler.go`.
- [x] 1.3 Initialize the validation fields with `validateGoogleIDToken` and `validateAppleIDToken` in `NewAuthHandler` in `backend/internal/handlers/auth_handler.go`.
- [x] 1.4 Refactor `GoogleSignIn` and `AppleSignIn` methods in `backend/internal/handlers/auth_handler.go` to use the handler's validation fields.

## Phase 2: Public Payments (Fail-Closed)

- [x] 2.1 Refactor client ID matching in `CreatePublic` within `backend/internal/handlers/payment_submission_handler.go` to return 403 if `lookupEvent` fails or is nil.
- [x] 2.2 Refactor client ID matching in `GetHistoryPublic` within `backend/internal/handlers/payment_submission_handler.go` to return 403 if `lookupEvent` fails or is nil.

## Phase 3: Testing & Verification

- [x] 3.1 Write unit tests in `backend/internal/handlers/auth_handler_test.go` verifying that blocked and deleted accounts are rejected via Google OAuth.
- [x] 3.2 Write unit tests in `backend/internal/handlers/auth_handler_test.go` verifying that pending deletion is cancelled for accounts in grace period via Google OAuth.
- [x] 3.3 Write unit tests in `backend/internal/handlers/auth_handler_test.go` verifying that blocked and deleted accounts are rejected via Apple OAuth.
- [x] 3.4 Write unit tests in `backend/internal/handlers/auth_handler_test.go` verifying that pending deletion is cancelled for accounts in grace period via Apple OAuth.
- [x] 3.5 Update payment submission handler tests in `backend/internal/handlers/payment_submission_handler_receipt_test.go` to cover fail-closed validation on event lookup errors.
- [x] 3.6 Create `backend/internal/handlers/event_review_handler_test.go` and write tests verifying that unauthorized tenants cannot update review responses or visibility (asserting 403).
