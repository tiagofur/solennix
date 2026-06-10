# Proposal: Session and Cache Integrity

## Intent

Resolve local storage/session caching inconsistencies to guarantee security, correct limit checks, and live status updates without browser refreshes.

## Scope

### In Scope
- Clear React Query cache using `queryClient.clear()` on logout (`signOut` and `auth:logout`).
- Replace memoized mount-time `new Date()` calculations with dynamic, per-render Date evaluations in plan limits hooks and dashboard KPI metrics.
- Invalidate collaborator timeline cache `['staff', 'my-timeline']` and availability `['staff', 'availability']` queries on `useRespondAssignment` success.
- Invalidate event and limit queries when coordinators save events using the direct `eventService` bypass.

### Out of Scope
- Backend multi-tenant structure updates.
- Refactoring the entire `EventForm.tsx` to use React Query `useMutation`.

## Approach

Clear the browser's React Query cache upon session termination. Ensure current-month calculations evaluate dynamically on each render so month boundaries trigger key changes. Invalidate related query keys (timeline, availability, event lists) immediately on mutations or data submissions.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/contexts/AuthContext.tsx` | Modified | Import `queryClient` and call `queryClient.clear()` on logout. |
| `web/src/hooks/usePlanLimits.ts` | Modified | Dynamically calculate dates using `new Date()` per render. |
| `web/src/pages/Dashboard.tsx` | Modified | Remove static memoization of the current month dates. |
| `web/src/hooks/queries/useStaffQueries.ts` | Modified | Invalidate timeline and availability on assignment response success. |
| `web/src/pages/Events/EventForm.tsx` | Modified | Invalidate events and plan limits queries on successful save. |
| `web/src/contexts/AuthContext.test.tsx` | Modified | Add tests for `queryClient.clear()` invocation on logout. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Circular dependency in AuthContext import | Low | Use lazy dynamic import or load from `@/lib/queryClient`. |
| Test environment query client pollution | Medium | Mock `queryClient` in `AuthContext.test.tsx` using `vi.mock`. |

## Rollback Plan

Revert git changes to the modified files to restore the previous static memoization and omit the cache clearing/invalidation calls.

## Dependencies

- None.

## Success Criteria

- [ ] `queryClient.clear()` is called when `signOut` is invoked or `auth:logout` event triggers.
- [ ] Plan limits boundaries resolve dynamically using the actual current month without app reload.
- [ ] Timeline updates instantly when a staff member accepts or declines an assignment.
- [ ] `init.sh` test suite passes at 100% green.
