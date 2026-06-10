## Exploration: Session and Cache Integrity

### Current State
1. **React Query Cache on Logout**:
   - `web/src/contexts/AuthContext.tsx` handles logouts via the `signOut` function and the `auth:logout` window event listener.
   - However, the React Query client (`queryClient` from `@/lib/queryClient`) is never imported or cleared. Consequently, stale server state remains in memory across sessions if a user logs out and another user logs in without a hard browser refresh.
2. **Plan Limits Dynamic Month**:
   - Both `web/src/hooks/usePlanLimits.ts` and `web/src/pages/Dashboard.tsx` define a frozen date using `useMemo(() => new Date(), [])`.
   - This prevents the month range from updating if the application is left open across month boundaries, leading to incorrect limit calculations and KPI queries based on the obsolete month.
3. **Stale Staff Timeline**:
   - The staff timeline query key is `['staff', 'my-timeline', { unreadOnly, limit }]`.
   - In `web/src/hooks/queries/useStaffQueries.ts`, the mutation hook `useRespondAssignment` only invalidates `queryKeys.staff.myAssignments` upon success. It does not invalidate `['staff', 'my-timeline']` or the availability queries, causing the timeline to remain stale.
   - Similarly, in `web/src/pages/Events/EventForm.tsx`, saving/updating an event bypasses standard query mutations and does not invalidate event queries or plan limits, leaving `EventSummary` and lists stale.

### Affected Areas
- `web/src/contexts/AuthContext.tsx` — Add `queryClient.clear()` in `signOut` and the `auth:logout` handler.
- `web/src/hooks/usePlanLimits.ts` — Remove the empty-dependency `useMemo` wrapper around `new Date()` (or make date range dynamic/evaluated per render).
- `web/src/pages/Dashboard.tsx` — Remove the empty-dependency `useMemo` wrapper around `new Date()` for the current month KPI bounds.
- `web/src/hooks/queries/useStaffQueries.ts` — Add invalidations for `['staff', 'my-timeline']` and `['staff', 'availability']` inside `useRespondAssignment`.
- `web/src/pages/Events/EventForm.tsx` — Dynamically import `queryClient` and invalidate `["events"]` and `["planLimits"]` upon successful event save.
- `web/src/contexts/AuthContext.test.tsx` — Add test cases validating that `queryClient.clear()` is called during sign out and logout events.

### Approaches
1. **Targeted Invalidation & Dynamic Evaluations** — Remove frozen date memoizations, clear the query cache on session end, and invalidate the staff timeline/assignments and event list queries on mutations/saves.
   - Pros: Correctly clears memory, ensures month transitions update query inputs automatically, and synchronizes the collaborator timeline immediately upon responding to assignments.
   - Cons: Slightly more render-time evaluations for date range formatting (practically negligible).
   - Effort: Low

### Recommendation
Proceed with Approach 1. It directly addresses each aspect of Issue #516 safely, without disrupting standard React Query patterns or introducing architectural overhead.

### Risks
- **Test Incompatibilities**: Mocking `queryClient` in test files needs to be handled cleanly to avoid Vitest environment pollution or circular imports.
- **Multiple Month Boundaries**: Since date formatting is fast, rendering it on every cycle is safe, but we must verify that query invalidation updates are correctly recognized by React Query keys.

### Ready for Proposal
Yes. The next recommended step is to run the proposal phase (`proposal.md`).
