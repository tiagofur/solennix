# Proposal: User Moderation and Account Deletion

## Intent

Empower ordinary users with self-service account deletion and provide administrators with panels to monitor inactivity, block spam/suspicious accounts, and receive actionable suggestions.

## Scope

### In Scope
- Endpoint `DELETE /api/users/me` initiating a 90-day grace period for account deletion.
- Integration in login to allow cancellation of pending deletion.
- A `last_active_at` column in `users` table, updated efficiently.
- Logging of security events (e.g., unauthorized access) into `AuditLog`.
- Administrative queries for inactive users and suspicious behavior.
- Query to identify registered users with zero created resources (inventory, products, clients) for email re-engagement suggestions.

### Out of Scope
- Direct physical hard-deletion logic (deferred to automatic cron/worker script).
- Frontend UI components for the iOS, Android, and Web apps (handled in later PRs).
- Direct automated email sending infrastructure (we provide the query/suggestions API for admin panel).

## Approach

Use existing moderation structures with a user-triggered 90-day grace window. Create a lightweight middleware to update `last_active_at` on requests (throttled). Write security alerts directly to the `AuditLog` table.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/models/models.go` | Modified | Add `LastActiveAt` to `User` struct. |
| `backend/internal/router/router.go` | Modified | Add `DELETE /users/me` endpoint. |
| `backend/internal/repository/user_repo.go` | Modified | Repository methods for self-deletion, profile updates, and active status tracking. |
| `backend/internal/handlers/auth_handler.go` | Modified | Handle `DELETE /users/me` and cancel deletion on login. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DB Lock Contention | Medium | Throttle `last_active_at` updates (max once per hour per user). |
| Accidental Data Deletion | Low | Strictly enforce `deletion_eligible_at` checks before final deletion. |

## Rollback Plan

Revert migrations and repository changes. Restore original user state in db if needed.

## Dependencies

- None.

## Success Criteria

- [ ] Users can trigger self-deletion via API.
- [ ] Users can log in to cancel pending deletion within 90 days.
- [ ] Admins can query for inactive users (no activity in 30+ days).
- [ ] Admins can query for users with zero created resources for re-engagement.
