## Exploration: user-moderation-deletion

### Current State
Currently, only manual administrator-driven blocking and deletion are implemented. When an administrator blocks a user, their `account_status` changes to `blocked`, and `deletion_eligible_at` is set to 6 months in the future. After 6 months, the admin can perform a soft delete, changing the status to `deleted` and setting `deleted_at`. Ordinary users have no way to delete or deactivate their own accounts (only `PUT /users/me` exists for profile updates). Additionally, while the `AuditLog` table exists and tracks general actions, there is no direct `last_active_at` or inactivity tracking in the `users` table, nor is there automated suspicious activity detection.

### Affected Areas
- `backend/internal/models/models.go` — Contains user and audit log structures.
- `backend/internal/router/router.go` — Endpoints definitions.
- `backend/internal/repository/user_repo.go` — Needs new repository operations for self-deletion and last-active tracking.
- `backend/internal/handlers/auth_handler.go` — Needs integration to update `last_active_at` on login/actions, and new self-deletion handler.

### Approaches
1. **Hybrid Action-Based Tracking & Self-Deletion** — Implement self-deletion with 90-day grace, updating `last_active_at` on requests using a lightweight middleware, and logging suspicious events (like 403 Forbidden) into `AuditLog` for admin analysis.
   - Pros: Highly accurate, completely automated grace recovery, zero disruption to existing admin moderation.
   - Cons: Small performance overhead from updating user timestamps (can be optimized by throttle).
   - Effort: Medium

### Recommendation
Implement the hybrid approach. Leverage the existing fields in `User` but configure the grace period to 90 days (`NOW() + INTERVAL '90 days'`) when triggered by the user via `DELETE /users/me`. Add a `last_active_at` timestamp column to the `users` table, updated on authentication. Use `AuditLog` to record security violations (such as unauthorized access attempts) which can then be aggregated for admin alerts. Add queries to check if a user has created zero resources (events, products, inventory) for re-engagement suggestions.

### Risks
- Data loss if the soft-delete/hard-delete transition executes prematurely.
- DB write lock congestion if the `last_active_at` updates are executed on every single API request. We must throttle or update only on auth login/refresh.

### Ready for Proposal
Yes. The orchestrator should proceed to the proposal phase.
