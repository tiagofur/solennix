# Tasks: User Moderation and Account Deletion

## Phase 1: Database and Model Foundation

- [x] 1.1 DB Migration: Create a SQL migration to add `last_active_at` column (timestamp with time zone) to `users` table.
- [x] 1.2 Model Definition: Modify `backend/internal/models/models.go` to add `LastActiveAt *time.Time` to `User` struct.
- [x] 1.3 Repository Setup: Add `UpdateLastActiveAt` query in `backend/internal/repository/user_repo.go` (with 1-hour throttle check).

## Phase 2: Core User Handlers & Logic

- [x] 2.1 Self-Deletion logic: Add `DeleteOwnAccount` repository query to set `account_status` = 'blocked' and `deletion_eligible_at` = NOW() + 90 days.
- [x] 2.2 Reversion logic: Add `CancelPendingDeletion` repository query to revert status to 'active' and clear grace time.
- [x] 2.3 Handler Creation: Implement `DeleteOwnAccount` in `backend/internal/handlers/auth_handler.go` to handle `DELETE /api/users/me`.
- [x] 2.4 Login Integration: Modify `Login` in `auth_handler.go` to detect and cancel pending deletions (restore status to 'active').
- [x] 2.5 Active Middleware: Implement active-state middleware update logic for updating `last_active_at` on authenticated requests.

## Phase 3: Administrative Auditing & Queries

- [x] 3.1 Security logs: Update authorization / tenant checking logic in backend to log `unauthorized_access` inside `AuditLog`.
- [x] 3.2 Repo Inactivity: Implement `GetInactiveUsers` (>30 days) and `GetUsersWithZeroResources` in `backend/internal/repository/admin_repo.go`.
- [x] 3.3 Handler Admin: Add GET `/api/admin/users/inactive` and GET `/api/admin/users/empty-resources` endpoints in `admin_handler.go`.
- [x] 3.4 Router wiring: Register `DELETE /api/users/me` and the new admin endpoints in `backend/internal/router/router.go`.

## Phase 4: Testing & Verification

- [x] 4.1 Unit Testing: Add tests in `auth_handler_test.go` for self-deletion and cancellation on login.
- [x] 4.2 Integration Testing: Verify throttled `last_active_at` updates and admin filters in integration tests.
- [x] 4.3 Documentation: Update current status in `docs/PRD/11_CURRENT_STATUS.md`.
