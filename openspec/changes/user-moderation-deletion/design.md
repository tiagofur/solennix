# Design: User Moderation and Account Deletion

## Technical Approach

We will extend the `users` table with a `last_active_at` timestamp. User self-deletion `DELETE /api/users/me` will set the user's `account_status` to `blocked` and schedule deletion with a 90-day grace period. Logging into a pending deletion account cancels the grace period and restores it to `active`.

We will introduce a lightweight throttled mechanism in the authentication flow to update `last_active_at`. A new query in the admin repository will report on inactivity and empty resources. Security middleware will record unauthorized accesses (403) to the `AuditLog` table.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Update `last_active_at` on every request | High DB write overhead and potential locking | Reject. Throttled updates (update only if last active was >1 hour ago) |
| Async worker for hard delete | Complexity of cron jobs and background runners in Chi | Reject. Out of scope for this change (keep soft-deleted in database for now) |

## Data Flow

```
User App (DELETE /api/users/me) ────→ Chi Router ────→ AuthHandler.DeleteOwnAccount
                                                                  │
                                                          (Set blocked state &
                                                          90 days grace date)
                                                                  │
                                                                  ▼
                                                              Database
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/internal/models/models.go` | Modify | Add `LastActiveAt *time.Time` to `User` struct. |
| `backend/internal/router/router.go` | Modify | Register `DELETE /api/users/me` routing under auth. |
| `backend/internal/repository/user_repo.go` | Modify | Implement `DeleteOwnAccount`, `CancelPendingDeletion`, and `UpdateLastActiveAt` (with 1-hour throttle check). |
| `backend/internal/handlers/auth_handler.go` | Modify | Add `DeleteOwnAccount` handler, and check/cancel pending deletion inside `Login` flow. |
| `backend/internal/repository/admin_repo.go` | Modify | Add `GetInactiveUsers` (>30 days) and `GetUsersWithZeroResources` queries. |
| `backend/internal/handlers/admin_handler.go` | Modify | Add endpoints `GET /api/admin/users/inactive` and `GET /api/admin/users/empty-resources`. |

## Interfaces / Contracts

```go
// In backend/internal/models/models.go
type User struct {
    // ... existing fields ...
    LastActiveAt *time.Time `json:"last_active_at,omitempty"`
}
```

```go
// In backend/internal/repository/user_repo.go
func (r *UserRepo) UpdateLastActiveAt(ctx context.Context, id uuid.UUID) error {
    query := `
        UPDATE users
        SET last_active_at = NOW()
        WHERE id = $1
          AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '1 hour')`
    _, err := r.pool.Exec(ctx, query, id)
    return err
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | User self-deletion logic and grace cancellation | Test handlers with mocked `UserRepo` in `auth_handler_test.go` |
| Integration | Throttled `last_active_at` updates and admin queries | Integration tests using test database pool |

## Migration / Rollout

A database migration is required to add `last_active_at` to the `users` table:
```sql
ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
```
