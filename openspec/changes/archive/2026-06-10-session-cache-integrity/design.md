# Design: Session and Cache Integrity

## Technical Approach
Implement query cache clearing at session termination endpoints, transition frozen date calculations to dynamic evaluations, and introduce targeted query invalidation to preserve cache-UI synchronicity.

## Architecture Decisions

### Decision: Clear Cache on Logout
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Invalidate specific queries | Leaves potentially sensitive tenant data in other queries. | Rejected |
| Component-unmount cache clear | Flaky due to React component mounting/unmounting timings. | Rejected |
| Clear cache in AuthContext | purges everything via `queryClient.clear()` during `signOut` & `auth:logout`. | **Chosen** (Rational: Ensures complete tenant isolation). |

### Decision: Plan Limits Date Evaluation
| Option | Tradeoff | Decision |
|--------|----------|----------|
| useMemo with dependencies | Hard to reactively trigger when actual date changes (e.g. at midnight). | Rejected |
| Dynamic per-render Date | Lightweight, evaluates `new Date()` directly, values stable as strings. | **Chosen** (Rational: Safe, simple, reactively updates keys on boundaries). |

### Decision: Staff Timeline Refresh
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Polling only | 30s latency in UI updates feels slow/broken to users. | Rejected |
| Target invalidation in mutation | Instant updates in UI on mutation success. | **Chosen** (Rational: Standard React Query mutation invalidation pattern). |

## Data Flow

```
Logout/Event ──→ AuthContext ──→ queryClient.clear() ──→ Redirect
Assignment Response ──→ useRespondAssignment ──→ Invalidate staff/my-timeline & availability
Event Save ──→ EventForm onSubmit ──→ eventService ──→ Invalidate events & planLimits
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `web/src/contexts/AuthContext.tsx` | Modify | Import `queryClient` and call `queryClient.clear()` in `signOut` and `handleLogout`. |
| `web/src/hooks/usePlanLimits.ts` | Modify | Evaluate dates per render, removing empty `useMemo`. |
| `web/src/pages/Dashboard.tsx` | Modify | Remove `today` memoization for KPI dates. |
| `web/src/hooks/queries/useStaffQueries.ts` | Modify | Invalidate timeline and availability keys on assignment response success. |
| `web/src/pages/Events/EventForm.tsx` | Modify | Invalidate `["events"]` and `["planLimits"]` on successful submit. |
| `web/src/contexts/AuthContext.test.tsx` | Modify | Mock `queryClient` and assert `clear` is called on logout. |

## Interfaces / Contracts
No changes to API interfaces or data models.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AuthContext` cache clear | Spy on `queryClient.clear()` in `AuthContext.test.tsx`. |
| Unit | `usePlanLimits` functionality | Verify existing tests continue to pass with dynamic dates. |
| Unit | `useRespondAssignment` invalidation | Verify that invalidation occurs for assignments, timeline, and availability. |

## Migration / Rollout
No database migration required. Phased frontend release.

## Open Questions
None.
