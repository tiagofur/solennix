# Tasks: Session and Cache Integrity

## Phase 1: Authentication and Session State

- [x] 1.1 Modify `web/src/contexts/AuthContext.tsx` to clear query cache via `queryClient.clear()` on logout.
- [x] 1.2 Update tests in `web/src/contexts/AuthContext.test.tsx` to mock and assert `queryClient.clear()` is called during sign out and logout events.

## Phase 2: Dynamic Month and Limits

- [x] 2.1 Refactor `web/src/hooks/usePlanLimits.ts` to calculate date bounds dynamically per render, removing empty `useMemo` date memoization.
- [x] 2.2 Refactor `web/src/pages/Dashboard.tsx` to calculate KPI date bounds dynamically per render, removing static `today` memoization.

## Phase 3: Invalidation and Query Sync

- [x] 3.1 Update `useRespondAssignment` in `web/src/hooks/queries/useStaffQueries.ts` to invalidate `['staff', 'my-timeline']` and `['staff', 'availability']`.
- [x] 3.2 Update `onSubmit` in `web/src/pages/Events/EventForm.tsx` to dynamically import `queryClient` and invalidate `["events"]` and `["planLimits"]`.

## Phase 4: Verification and Documentation

- [x] 4.1 Run `npm run test:run` in the `web` folder to ensure all test suites pass.
- [x] 4.2 Update `docs/PRD/11_CURRENT_STATUS.md` and mark the task as `done` in `feature_list.json`.
