### Problem to solve
Current team calendar behavior is mostly month filter + grouped list, not a real operational calendar. Team members cannot plan day/week workload effectively.

### Proposed solution
Ship a real Team Member operational calendar with Month/Week/Day modes.
- Month: density indicators per day.
- Week: shift timeline and overlap visibility.
- Day: agenda by hour.
- Event tap opens Team Event Detail.

### Platform impact
- [x] iOS
- [x] Android
- [x] Web
- [x] Backend

### Acceptance criteria
- Given assignments across dates, when opening calendar, then month cells display assignment density.
- Given assignments with shifts, when switching to week mode, then timeline placement matches start/end.
- Given same-day assignments, when switching to day mode, then agenda is sorted chronologically.
- Given tap on any assignment, when selected, then Team Event Detail opens.
- Given role is organizer, when opening organizer calendar, then existing organizer behavior is unchanged.

### Estimation
- Backend: 1.0d (range query optimization + contract docs)
- Web: 2.0d
- iOS: 2.0d
- Android: 2.0d
- QA/Parity: 1.0d
- Total: 8.0d