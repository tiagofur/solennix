### Problem to solve
The Team Member Portal backlog now exists as six separate issues, but there is no single roadmap issue that groups scope, execution order, and dependencies for delivery planning.

### Proposed solution
Create an umbrella Epic for Team Member Portal Ola 4 and track the rollout in three phases.

Phase A — Daily utility
- [ ] #337 H2 Assignments inbox with fast accept/decline
- [ ] #336 H1 My Day home for invited team members
- [ ] #338 H3 Operational calendar (month/week/day)

Phase B — Event execution
- [ ] #339 H4 Team-scoped event detail

Phase C — Coordination and reliability
- [ ] #340 H5 Assignment/event change timeline
- [ ] #341 H6 Team member availability management

Execution notes:
- Start with #337 because it strengthens the primary workflow that already exists in Phase 3.5.
- Ship #336 next to create a strong daily entrypoint.
- Use #338 as the calendar foundation before building #339 event detail.
- Finish with #340 and #341 to close coordination and future planning loops.

### Platform impact
- [x] iOS
- [x] Android
- [x] Web
- [x] Backend

### Acceptance criteria
- Given a maintainer opens the epic, when reviewing roadmap status, then they can navigate to all Team Member Portal stories from one issue.
- Given delivery planning happens, when reviewing the epic, then the order A/B/C and issue dependencies are explicit.
- Given implementation starts, when issues are completed, then progress can be tracked from the umbrella checklist.
- Given PRD is consulted, when reviewing `docs/PRD/17_PERSONAL_TRACKER.md`, then the execution order matches this epic.