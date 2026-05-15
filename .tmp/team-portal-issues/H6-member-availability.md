### Problem to solve
Team members cannot proactively mark their own availability windows, causing assignment conflicts and avoidable declines.

### Proposed solution
Add Team Member Availability management.
- Member can create blocks by day/time range.
- Basic notification preferences per member.
- Organizer assignment surfaces can consume availability context.

### Platform impact
- [x] iOS
- [x] Android
- [x] Web
- [x] Backend

### Acceptance criteria
- Given member creates an unavailable block, when saved, then block appears in member calendar and availability API.
- Given overlapping block creation, when user saves, then validation prevents invalid overlaps or merges according to rule.
- Given organizer creates assignment in blocked window, when viewing staff options, then member is marked as unavailable.
- Given member edits/removes block, when refreshed, then updated availability is reflected immediately.
- Given notification preference disabled, when non-critical update occurs, then push is not sent.

### Estimation
- Backend: 2.0d (availability CRUD + validation rules)
- Web: 1.0d
- iOS: 1.0d
- Android: 1.0d
- QA/Parity: 1.0d
- Total: 6.0d