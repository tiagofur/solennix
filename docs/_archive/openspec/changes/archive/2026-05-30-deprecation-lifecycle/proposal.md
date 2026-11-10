# Proposal: API Deprecation Lifecycle

## Intent
Provide explicit, standard HTTP deprecation signals to API consumers of legacy version and route aliases. This prevents sudden client breakages by establishing sunset dates and visible transit signals.

## Scope

### In Scope
- Create reusable deprecation middleware that injects `Deprecation`, `Sunset`, and `Link` HTTP headers.
- Deprecate `/api` legacy path alias (favoring versioned `/api/v1`).
- Deprecate `/organizer/payment-submissions` legacy route alias (favoring `/payment-submissions`).
- Write middleware unit tests.

### Out of Scope
- Actually retiring the routes (removal). They remain functional during transition.
- Deprecating versioned public endpoints.

## Approach
Implement `Deprecation` middleware in Go that sets:
- `Deprecation: true`
- `Sunset: Wed, 30 Sep 2026 00:00:00 GMT`
- `Link: <https://github.com/tiagofur/solennix/wiki/API-Deprecation-Policy>; rel="deprecation"`
Mount this middleware on `/api` and `/organizer/payment-submissions` routes in `router.go`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/middleware/version.go` | Modified | Add `Deprecate` middleware function. |
| `backend/internal/router/router.go` | Modified | Wrap legacy routes with `Deprecate`. |
| `backend/internal/middleware/version_test.go` | Modified | Add tests for `Deprecate` middleware. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Client parse errors on headers | Low | Ensure compliance with RFC 7231 / 8594 specs. |

## Rollback Plan
Remove the middleware wrapper from routes in `router.go`.

## Dependencies
None.

## Success Criteria
- [ ] Requests to `/api/auth/login` include `Deprecation: true` header.
- [ ] Requests to `/organizer/payment-submissions` include `Sunset` header.
- [ ] Requests to `/api/v1/auth/login` do NOT include deprecation headers.
