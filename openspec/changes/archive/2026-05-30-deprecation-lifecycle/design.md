# Design: API Deprecation Lifecycle

## Technical Approach
Implement a reusable middleware `Deprecate` in `backend/internal/middleware/version.go` that handles injecting standard HTTP deprecation headers. Wrap legacy routes in `backend/internal/router/router.go` with this middleware.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Centralized headers | Go Middleware | Inline headers | centralizes the header generation, avoids duplication, highly reusable. |
| Sunset time representation | `time.Time` parameter | Static string in handler | allows distinct sunset dates for different deprecated endpoints if needed. |

## Data Flow

    Client ──(Request)──→ Router ──→ Deprecate Middleware ──→ Handler
                                           │
    Client ←──(Response with Deprecation/Sunset Headers)───────┘

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/internal/middleware/version.go` | Modify | Add `Deprecate` middleware function. |
| `backend/internal/middleware/version_test.go` | Modify | Add tests for `Deprecate` middleware. |
| `backend/internal/router/router.go` | Modify | Mount `Deprecate` middleware on legacy route groups. |

## Interfaces / Contracts

```go
func Deprecate(sunsetTime time.Time, policyURL string) func(http.Handler) http.Handler
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Deprecate middleware headers | Mock request and verify response headers (Deprecation, Sunset, Link) are set properly. |
| Integration | Deprecated router endpoints | Send request to legacy route alias (e.g. `/api/auth/login`) and verify headers exist. |

## Migration / Rollout
No migration required.
