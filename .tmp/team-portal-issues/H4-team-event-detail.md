### Problem to solve
Team members currently lack an execution-focused event detail. They need a concise briefing, not full organizer CRM detail.

### Proposed solution
Create Team Event Detail scoped to member operations.
- Summary: event name, date/time, assignment status, shift, role.
- Operations: location + open in maps, operational contact, organizer notes.
- Personal execution: checklist and quick notes.
- Keep sensitive organizer-only data hidden.

### Platform impact
- [x] iOS
- [x] Android
- [x] Web
- [x] Backend

### Acceptance criteria
- Given a team member opens assigned event, when detail loads, then they see only scoped fields relevant to execution.
- Given event has location, when user taps maps action, then external map app/web opens.
- Given checklist items exist, when user toggles completion, then status persists and survives refresh.
- Given user is not assigned to event, when opening URL/route directly, then access is denied.
- Given organizer opens organizer event detail, then organizer fields remain unchanged.

### Estimation
- Backend: 2.0d (scoped endpoint + auth guards + checklist persistence)
- Web: 1.5d
- iOS: 1.5d
- Android: 1.5d
- QA/Parity: 1.0d
- Total: 7.5d