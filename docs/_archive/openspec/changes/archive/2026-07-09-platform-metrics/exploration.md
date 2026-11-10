## Exploration: platform-metrics

### Current State
Currently, Solennix does not track which platform ('web', 'ios', or 'android') a user registers on, nor does it keep a running log of which platforms a user actively uses or the intensity of their activity (interactions).
- The `users` table tracks general metrics like `created_at` and `last_active_at`, but has no concept of platform origins.
- The `device_tokens` table tracks registered push notification tokens and their platform, but this only includes users who explicitly opted in to push notifications, which is an incomplete indicator of platform usage.
- The `ActivityTracker` middleware in the backend updates `last_active_at` on every request but has no context on platform usage or volume of requests.

### Affected Areas
- **Backend Database Migrations**:
  - `backend/internal/database/migrations/060_add_user_platform_metrics.up.sql` — Creates `user_platforms` table and adds `registration_platform` column to `users` table.
- **Backend Models & Repository**:
  - `backend/internal/models/models.go` — Add platform fields to `User` struct and define the new `UserPlatform` or aggregation structs.
  - `backend/internal/repository/user_repo.go` — DB queries to save/update registration platform and active platform interaction counts.
  - `backend/internal/repository/admin_repo.go` — Retrieve aggregates for global stats and per-user platform activity.
- **Backend Handlers & Middleware**:
  - `backend/internal/middleware/auth.go` — Capture User-Agent or custom header (`X-Client-Platform`) to increment activity counts in memory.
  - `backend/internal/handlers/auth_handler.go` — Capture and save the platform when a new user registers.
  - `backend/internal/handlers/admin_handler.go` — Expose updated platform usage statistics.
- **Web Frontend**:
  - `web/src/services/adminService.ts` — Update Type definitions (`PlatformStats`, `AdminUser`) and API endpoints.
  - `web/src/pages/Admin/AdminDashboard.tsx` — Render platform metrics charts (signups by platform, usage by platform, intensity metrics).
  - `web/src/pages/Admin/AdminUsers.tsx` — Add platform badges next to user names.
  - `web/src/pages/Admin/AdminUserDetails.tsx` — Show platform-specific interaction counts and last used timestamps.

### Approaches
1. **Direct DB updates per request**
   - Pros: Simple, database represents real-time data immediately.
   - Cons: Performance bottleneck. Writing to the DB on every single HTTP request will degrade response times and scale poorly.
   - Effort: Low

2. **In-memory Buffering & Batch Worker (Recommended)**
   - Pros: Zero latency impact on client requests. We increment counts in an in-memory thread-safe map (`sync.Map` or channel-based buffer) and flush them to the DB using a background worker (e.g. every 1 minute) in a single batch UPSERT.
   - Cons: Slightly more complex Go code to manage the worker loop and concurrency.
   - Effort: Medium

### Recommendation
Approach 2 is highly recommended to protect application performance. Go's concurrency model handles in-memory increments in microseconds. Grouping DB writes into a periodic batch update ensures that Solennix scales gracefully without making HTTP responses slower.

### Risks
- **User-Agent Spoofing/Accuracy**: Standard web browsers and web views have complex User-Agents. We must implement a robust helper to correctly parse and categorize User-Agents into `web`, `ios`, or `android`, with a fallback to `web`.
- **Graceful Shutdown**: The background worker could lose in-memory metrics if the server crashes or restarts. This risk is minor (1-2 minutes of interaction counts maximum), but we can mitigate it by subscribing to termination signals to flush the buffer before exiting.

### Ready for Proposal
Yes. The technical parameters and performance constraints are clear. We can proceed to draft the Proposal.
