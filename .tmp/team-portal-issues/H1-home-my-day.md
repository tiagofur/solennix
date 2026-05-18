### Problem to solve
Invited team members do not have a single daily entrypoint. They open list/filter screens and still cannot quickly answer: what do I have today, what needs response now, and what changed.

### Proposed solution
Create a Team Member home screen ("My Day") as the default destination after login for `team_member` users.
- Sections: Today, Next 7 days, Pending responses.
- Primary actions: Go to today agenda, Review assignments.
- Include loading/empty/error states and role guard isolation from organizer shell.

### Platform impact
- [x] iOS
- [x] Android
- [x] Web
- [x] Backend

### Acceptance criteria
- Given a `team_member` with assignments, when they open the app, then they see Today + Next 7 days + Pending responses in one screen.
- Given there are pending invitations, when user taps "Review assignments", then assignments inbox opens with pending filtered first.
- Given there are no assignments, when screen loads, then empty state explains no work planned.
- Given API fails, when screen loads, then retry action is available and works.
- Given organizer role logs in, when opening app, then organizer home remains unchanged.

### Estimation
- Backend: 1.5d (aggregated endpoint + auth tests)
- Web: 1.5d
- iOS: 1.5d
- Android: 1.5d
- QA/Parity: 1d
- Total: 7.0d