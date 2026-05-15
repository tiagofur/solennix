### Problem to solve
Assignment response exists but still feels fragmented and slow for team members, especially when they need to process multiple invites quickly.

### Proposed solution
Implement a dedicated Assignments Inbox optimized for decision speed.
- Assignment card fields: date, shift, role, location, fee (if present), organizer notes.
- Actions: Accept / Decline from card.
- Optional decline reason support if backend field is enabled.
- Optimistic update + conflict handling for first-accept-wins groups.

### Platform impact
- [x] iOS
- [x] Android
- [x] Web
- [x] Backend

### Acceptance criteria
- Given a pending assignment, when user taps Accept, then status transitions to confirmed and card moves out of pending.
- Given a pending assignment, when user taps Decline, then status transitions to declined and UI confirms completion.
- Given first-accept-wins slot is already filled, when user tries Accept, then conflict message is shown and status refreshes.
- Given network latency, when user responds, then button state prevents duplicate taps.
- Given optional decline reason enabled, when declining, then reason is persisted and visible in backend logs/audit.

### Estimation
- Backend: 1.0d (optional decline reason + tests)
- Web: 1.0d
- iOS: 1.0d
- Android: 1.0d
- QA/Parity: 0.5d
- Total: 4.5d