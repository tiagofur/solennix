# Tasks: API Deprecation Lifecycle

## Phase 1: Foundation / Middleware
- [x] 1.1 Create `Deprecate` middleware function in `backend/internal/middleware/version.go`.
- [x] 1.2 Import necessary standard libraries (`time`, `fmt`) in `backend/internal/middleware/version.go`.

## Phase 2: Core Implementation / Routing
- [x] 2.1 Update `backend/internal/router/router.go` to mount `Deprecate` on legacy `/api` routes with sunset date `30 Sep 2026`.
- [x] 2.2 Update `backend/internal/router/router.go` to mount `Deprecate` on legacy `/organizer/payment-submissions` routes.

## Phase 3: Testing / Verification
- [x] 3.1 Write unit tests for `Deprecate` middleware in `backend/internal/middleware/version_test.go`.
- [x] 3.2 Add integration tests verifying deprecation headers on legacy routes in `backend/internal/router/router_test.go`.

## Phase 4: PRD Update
- [x] 4.1 Update `docs/PRD/11_CURRENT_STATUS.md` to document the API deprecation lifecycle rollout status.
