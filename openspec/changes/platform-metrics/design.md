# Design: platform-metrics

## Technical Approach

Implement platform analytics with zero performance impact. The middleware captures User-Agent or the `X-Client-Platform` header, increments a concurrency-safe in-memory cache, and a background Go worker flushes aggregates to PostgreSQL every 60 seconds in batch. The admin API is updated to return registration and active usage metrics.

## Architecture Decisions

| Decision | Tradeoff | Choice & Rationale |
|---|---|---|
| In-memory aggregation | Minor data loss on crash (max 60s) vs High DB write load | **In-memory cache + Ticker worker**: Writing on every request raises latency and DB connections. RAM updates are sub-microsecond and safe. |
| Platform Inference | User-Agent heuristics vs Explicit client headers | **Hybrid heuristic**: Priority to `X-Client-Platform` header, fallback to `User-Agent` regex. Supports legacy clients automatically. |

## Data Flow

```
[HTTP Request] ──> [ActivityTracker (Go middleware)]
                        │
                        ├── (1) Identify Platform (Header/User-Agent)
                        └── (2) Memory Cache: Increment [userID][platform] +1
                                
[Background Ticker (Every 60s)]
                        │
                        ├── (1) Swap & Flush Memory Cache
                        └── (2) DB Query: Bulk UPSERT to `user_platforms` table
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/internal/database/migrations/060_add_user_platform_metrics.up.sql` | Create | DB updates: adds `users.registration_platform`, creates `user_platforms` table. |
| `backend/internal/database/migrations/060_add_user_platform_metrics.down.sql` | Create | Downgrade scripts. |
| `backend/internal/models/models.go` | Modify | Update `User` and define `UserPlatform` structures. |
| `backend/internal/middleware/auth.go` | Modify | Add `ActivityBuffer` cache and background Go routine. |
| `backend/internal/repository/user_repo.go` | Modify | DB writes for registration platform. |
| `backend/internal/repository/admin_repo.go` | Modify | Queries for global dashboard metrics and per-user stats. |
| `backend/internal/handlers/auth_handler.go` | Modify | Inject platform into registration requests. |
| `backend/internal/handlers/admin_handler.go` | Modify | Expose stats in API response JSON. |
| `web/src/services/adminService.ts` | Modify | Update type declarations and endpoints. |
| `web/src/pages/Admin/AdminDashboard.tsx` | Modify | Build platform graphs using Recharts. |
| `web/src/pages/Admin/AdminUsers.tsx` | Modify | Insert compact badges indicating user platforms. |
| `web/src/pages/Admin/AdminUserDetails.tsx` | Modify | Load and display user-specific platform logs and charts. |

## Interfaces / Contracts

### DB Schema
```sql
ALTER TABLE users ADD COLUMN registration_platform VARCHAR(20) DEFAULT 'unknown';

CREATE TABLE user_platforms (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    interaction_count INT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, platform)
);
```

### In-Memory Aggregations (Go)
```go
type ActivityRecord struct {
	UserID   uuid.UUID
	Platform string
	Count    int
}

type Buffer struct {
	mu   sync.Mutex
	data map[uuid.UUID]map[string]int
}
```

### API Contracts
`GET /api/admin/stats`:
```json
{
  "registrations_by_platform": { "web": 150, "ios": 80, "android": 40 },
  "active_users_by_platform": { "web": 120, "ios": 75, "android": 30 },
  "interactions_by_platform": { "web": 4500, "ios": 9200, "android": 1800 }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | User-Agent parsing heuristics | Tests mapping various browsers, iOS and Android clients to correct keys. |
| Integration | Concurrency & Worker Flushing | Mock database writes with concurrent goroutines running request trackers. |
| Manual | Admin view rendering | Validate graphs render correctly with sample metrics. |

## Migration / Rollout

Run migration `060`. Populate old registrations using:
```sql
UPDATE users 
SET registration_platform = COALESCE(
    (SELECT platform FROM device_tokens WHERE user_id = users.id LIMIT 1),
    'unknown'
)
WHERE registration_platform = 'unknown';
```
No frontend breaking changes occur during rollout.

## Open Questions

None.
