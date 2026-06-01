# User Moderation and Account Deletion Specification

## Purpose

Define the requirements for user self-service account deletion, 90-day grace period, inactivity tracking, and admin capabilities for monitoring users and detecting suspicious activity.

## Requirements

### Requirement: User Self-Service Deletion
The system MUST allow ordinary users to initiate account deletion, which transitions their status to pending deletion under a 90-day grace period.

#### Scenario: User requests account deletion
- GIVEN an active authenticated user
- WHEN the user sends a DELETE request to `/api/users/me`
- THEN the account status MUST change to 'blocked'
- AND `deletion_eligible_at` MUST be set to 90 days from now

#### Scenario: User logs in during grace period
- GIVEN a user account with status 'blocked' and a pending deletion within the 90-day grace period
- WHEN the user successfully logs in
- THEN the account status MUST revert to 'active'
- AND `deletion_eligible_at` MUST be set to null

### Requirement: Efficient Activity Tracking
The system MUST track the user's last activity date efficiently without causing DB lock contention.

#### Scenario: User performs an API request
- GIVEN an authenticated active user
- WHEN the user makes any authenticated API request
- THEN the system SHOULD update `last_active_at` in the DB if the last update was more than 1 hour ago

### Requirement: Inactivity and Empty Resource Reporting for Admin
The system MUST allow administrators to query for inactive users and users who have created zero resources.

#### Scenario: Admin queries inactive users
- GIVEN an administrator
- WHEN the admin requests a list of users inactive for 30+ days
- THEN the system MUST return users whose `last_active_at` is older than 30 days

#### Scenario: Admin queries empty resource users
- GIVEN an administrator
- WHEN the admin requests users with zero events, products, or inventory
- THEN the system MUST return users who have created no resources

### Requirement: Suspicious Activity Logging
The system MUST log security violations as suspicious actions.

#### Scenario: User triggers a forbidden error
- GIVEN an authenticated user
- WHEN the user attempts to access another user's resource (triggering 403)
- THEN the system MUST write an `unauthorized_access` entry to the `AuditLog`
