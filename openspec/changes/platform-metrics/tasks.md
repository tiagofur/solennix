# Tasks: platform-metrics

## Phase 1: DB & Foundation

- [ ] 1.1 Create migration files `060_add_user_platform_metrics.up.sql` and `060_add_user_platform_metrics.down.sql` with schema modifications and historical inference.
- [ ] 1.2 Update `User` model and define `UserPlatform` structs in `backend/internal/models/models.go`.
- [ ] 1.3 Implement `UpdateUserRegistrationPlatform` and `UpsertUserPlatforms` queries in `backend/internal/repository/user_repo.go`.

## Phase 2: Backend Core & Middleware

- [ ] 2.1 Add User-Agent detection helper in `backend/internal/middleware/auth.go` (support `X-Client-Platform` override).
- [ ] 2.2 Define the thread-safe `ActivityBuffer` cache with sync.Mutex in `backend/internal/middleware/auth.go`.
- [ ] 2.3 Set up background Go routine (Ticker) to flush buffered interactions to the DB every 60s using `UpsertUserPlatforms`.
- [ ] 2.4 Integrate memory buffer increment into the `ActivityTracker` middleware inside `backend/internal/middleware/auth.go`.

## Phase 3: APIs & Handlers

- [ ] 3.1 Modify `Register` in `backend/internal/handlers/auth_handler.go` to capture registration platform.
- [ ] 3.2 Add platform query execution methods to `AdminRepo` in `backend/internal/repository/admin_repo.go`.
- [ ] 3.3 Modify `GetStats` in `backend/internal/handlers/admin_handler.go` to expose platform metrics.
- [ ] 3.4 Update `GetUser` in `backend/internal/handlers/admin_handler.go` to include user platform metrics.

## Phase 4: Frontend UI implementation

- [ ] 4.1 Update TypeScript models and endpoints in `web/src/services/adminService.ts`.
- [ ] 4.2 Add platform signup/usage graphs (Recharts) inside `web/src/pages/Admin/AdminDashboard.tsx`.
- [ ] 4.3 Add platform badges to rows in the users list `web/src/pages/Admin/AdminUsers.tsx`.
- [ ] 4.4 Add platform detailed statistics cards and charts to `web/src/pages/Admin/AdminUserDetails.tsx`.

## Phase 5: Verification & Tests

- [ ] 5.1 Write unit tests for User-Agent detection heuristics in `backend/internal/middleware/auth_test.go`.
- [ ] 5.2 Write integration tests for concurrency safety and worker flushing of the activity buffer.
- [ ] 5.3 Verify API responses for `/api/admin/stats` and `/api/admin/users/:id` contain platform attributes.
- [ ] 5.4 Execute manual UI verification on the web dashboard to ensure correct layout and alignment.
