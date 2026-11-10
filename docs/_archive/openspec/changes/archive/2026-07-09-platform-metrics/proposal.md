# Proposal: platform-metrics

## Intent

Track user registration platform and active usage metrics in the Admin Dashboard without degrading API response times.

## Scope

### In Scope
- DB migration: Add `users.registration_platform` and `user_platforms` table.
- DB migration: Infer platform for existing users from `device_tokens`.
- Backend: User-Agent detection (with `X-Client-Platform` header priority) fallback to `web` / `unknown`.
- Backend: Concurrency-safe in-memory buffer + 1-minute worker to batch update active platform interaction counts.
- Backend: Add platform aggregates to `GET /api/admin/stats` and user details `GET /api/admin/users/:id`.
- Web UI: Badges in `/admin/users` and detailed cards/charts in `/admin/users/:id` & `/admin`.

### Out of Scope
- Frontend client modification (rely on User-Agent heuristics for now).
- Tracking raw audit logs for every interaction (aggregate counts only).

## Approach

Use Go middleware `ActivityTracker` to detect request platform and update an in-memory batch buffer. A background goroutine flushes these aggregates to the DB every 1 minute.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/database/migrations/` | New | SQL scripts for DB updates (060 migration). |
| `backend/internal/models/models.go` | Modified | Add `RegistrationPlatform` to `User` model. |
| `backend/internal/repository/user_repo.go` | Modified | Database queries for registration platform and active platform. |
| `backend/internal/repository/admin_repo.go` | Modified | Stats retrieval for aggregates and user platform usage. |
| `backend/internal/middleware/auth.go` | Modified | Update `ActivityTracker` to capture platform and buffer counts. |
| `backend/internal/handlers/` | Modified | Update auth and admin handlers to receive/expose metrics. |
| `web/src/services/adminService.ts` | Modified | Extend types and API handlers. |
| `web/src/pages/Admin/` | Modified | Display metrics in Dashboard, Users, and Details views. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API request latency increase | Low | Batch updates in memory. Zero database operations in the request path. |
| User-Agent mismatch / accuracy | Med | Test parser helper thoroughly; default unknown agents to `unknown` / `web`. |
| Memory usage growth | Low | Pre-allocated bounded map in memory. |

## Rollback Plan

Revert backend and frontend commits, run migration `060_add_user_platform_metrics.down.sql`.

## Dependencies

None.

## Success Criteria

- [ ] HTTP endpoint latency remains under baseline (< 5ms overhead).
- [ ] Admin Dashboard displays registration and usage metrics.
- [ ] Individual User Details page shows exact interactions per platform.
