# Tasks: User Moderation and Account Deletion (Frontend Web)

## Phase 1: Service and Query Layer
- [x] 1.1 Service setup: Add `getInactiveUsers`, `getUsersWithZeroResources`, and `moderationStatus` support in `web/src/services/adminService.ts`.
- [x] 1.2 Query setup: Implement React Query hooks in `web/src/hooks/queries/useAdminQueries.ts`.

## Phase 2: User Account Deletion UI
- [x] 2.1 Interactive UI: Update `web/src/pages/AccountDeletion.tsx` with dynamic self-service layout for authenticated users.
- [x] 2.2 API call & logout: Integrate the `api.delete` call, success toast, and logout sequence.

## Phase 3: Administrative Moderation & Auditing UI
- [ ] 3.1 Moderation panels: Update `web/src/pages/Admin/AdminUsers.tsx` with auditing options and panels.
- [ ] 3.2 Moderate actions: Enable administrative block or delete actions.

## Phase 4: Verification & Testing
- [ ] 4.1 Unit Testing: Add `AccountDeletion.test.tsx` and update `AdminUsers.test.tsx`.
- [ ] 4.2 Verify build: Run linter and tests to ensure no regressions in frontend Web.
