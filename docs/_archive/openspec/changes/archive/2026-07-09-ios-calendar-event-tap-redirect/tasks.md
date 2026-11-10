# Tasks: iOS Calendar Event Tap Redirection

## Phase 1: iOS UI Refactoring
- [x] 1.1 Refactor `EventosFilteredList` in `EventosLayoutFactory.swift` to wrap the event cell directly inside a `NavigationLink` instead of `ZStack` and `EmptyView`.

## Phase 2: Testing & Verification
- [x] 2.1 Run iOS packages build to verify compilation.
- [x] 2.2 Verify that all tests pass using the global `./init.sh` validation suite.

## Phase 3: Documentation / PRD Update
- [x] 3.1 Update `docs/PRD/11_CURRENT_STATUS.md` documenting this UI redirection fix.
