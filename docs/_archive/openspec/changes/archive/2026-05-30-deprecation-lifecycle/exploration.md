## Exploration: deprecation-lifecycle

### Current State
Today, the backend has versioning support (`/api/v1` and `/api`) and some backward-compatible routes (like `/organizer/payment-submissions` mounted on the `apiRouter` and `/api/uploads/*` on the main router). However, there are no transition signals or HTTP headers on legacy aliases, meaning clients could be broken without warning if a legacy endpoint is retired.

### Affected Areas
- `backend/internal/middleware/version.go` — to add a Deprecation/Sunset middleware or helper.
- `backend/internal/router/router.go` — to apply the deprecation/sunset middleware to `/api/...` legacy version alias and `/organizer/...` legacy alias.

### Approaches
1. **Middleware-based headers** — Implement a custom deprecation middleware that injects standard HTTP headers (`Deprecation: true`, `Sunset: <date>`, `Link: <url>`) on deprecated route groups.
   - Pros: Clean, centralized, reusable.
   - Cons: Small performance cost of middleware invocation.
   - Effort: Low

2. **Inline handler headers** — Add headers manually inside each deprecated route's handler.
   - Pros: Simple.
   - Cons: Duplicated code, prone to omissions.
   - Effort: Medium

### Recommendation
Use Approach 1 (Middleware-based headers) because it is reusable and ensures that all routes mounted on a deprecated group automatically receive proper headers.

### Risks
- Wrong date format in the Sunset header could confuse strict clients. We must use standard HTTP-date format (RFC 7231, e.g. `Sunset: Wed, 11 Nov 2026 00:00:00 GMT`) per RFC 8594.

### Ready for Proposal
Yes
