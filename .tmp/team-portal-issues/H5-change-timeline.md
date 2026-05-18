### Problem to solve
Team members miss critical changes (shift, location, role) and only discover them late. There is no dedicated change feed for assigned work.

### Proposed solution
Add a Team Change Timeline for assignment/event updates.
- Change feed per member with read/unread state.
- Event-level timeline section inside Team Event Detail.
- Push/deeplink support to changed event.

### Platform impact
- [x] iOS
- [x] Android
- [x] Web
- [x] Backend

### Acceptance criteria
- Given organizer updates shift/location/role, when team member opens app, then change appears in timeline.
- Given unread changes, when user views change item, then item becomes read.
- Given push notifications enabled, when critical change happens, then push deep-links to affected event.
- Given same change is emitted multiple times, when feed renders, then duplicates are collapsed or deduplicated.
- Given member not assigned, when change is emitted, then they never receive it.

### Estimation
- Backend: 2.0d (event sourcing/log table + feed endpoint)
- Web: 1.0d
- iOS: 1.0d
- Android: 1.0d
- QA/Parity: 1.0d
- Total: 6.0d