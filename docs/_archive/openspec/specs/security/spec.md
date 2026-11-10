# Security & Access Control Specification

## Purpose
Define access control gates and tenant isolation requirements for OAuth logins, public client portal submissions, and event review modifications.

## Requirements

### Requirement: OAuth Account Status Gate
The system MUST validate account status during Google/Apple OAuth logins.
- Blocked accounts WITHOUT a pending deletion grace period MUST be rejected.
- Deleted accounts MUST be rejected.
- Blocked accounts WITH a pending deletion grace period (in the future) MUST be reactivated, and their pending deletion cancelled.

#### Scenario: OAuth Login with Blocked Account (No Grace Period)
- GIVEN a blocked user account with `DeletionEligibleAt = nil`
- WHEN the user attempts to sign in via Google or Apple OAuth
- THEN the system MUST return `403 Forbidden` with the error `auth.account_blocked`

#### Scenario: OAuth Login with Deleted Account
- GIVEN a deleted user account
- WHEN the user attempts to sign in via Google or Apple OAuth
- THEN the system MUST return `403 Forbidden` with the error `auth.account_deleted`

#### Scenario: OAuth Login with Account in Deletion Grace Period
- GIVEN a blocked user account with `DeletionEligibleAt` set in the future
- WHEN the user attempts to sign in via Google or Apple OAuth
- THEN the system MUST cancel the pending deletion, set the status to `active`, and issue session tokens

---

### Requirement: Public Payment Event-Client Validation
The public payment submission and history endpoints MUST validate that the client ID belongs to the event. If event verification fails or is absent, the system MUST fail-closed.

#### Scenario: Public Payment Submission Mismatched Client
- GIVEN an active public event link for event A with client A
- WHEN a client makes a submission request with client B's ID
- THEN the system MUST return `403 Forbidden` with the error `Client ID mismatch`

#### Scenario: Public Payment History Mismatched Client
- GIVEN an active public event link for event A with client A
- WHEN a client requests payment history with client B's ID
- THEN the system MUST return `403 Forbidden` with the error `Client ID mismatch`

#### Scenario: Public Payment Event Lookup Failure (Fail-Closed)
- GIVEN a request to a public payment endpoint
- WHEN the event lookup query fails due to database errors or the event is missing
- THEN the system MUST fail-closed and return `403 Forbidden`

---

### Requirement: Event Review Isolation
The organizer response and review visibility endpoints MUST ensure only the review owner can perform updates.

#### Scenario: Unauthorized Organizer Review Response
- GIVEN a review for an event owned by organizer A
- WHEN organizer B attempts to patch the organizer response
- THEN the system MUST return `403 Forbidden`

#### Scenario: Unauthorized Organizer Review Visibility Update
- GIVEN a review for an event owned by organizer A
- WHEN organizer B attempts to update the review visibility
- THEN the system MUST return `403 Forbidden`
