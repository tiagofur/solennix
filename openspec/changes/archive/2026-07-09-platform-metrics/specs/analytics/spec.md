# Analytics Specification

## Purpose

Track and aggregate user registration and interaction platforms to enable administrative decision-making while ensuring zero performance impact on core services.

## Requirements

| ID | Requirement | Description |
|---|---|---|
| ANA-1 | Registration Platform Capture | The backend MUST store the registration platform for new users based on the request header `X-Client-Platform` or `User-Agent`. |
| ANA-2 | Active Platform Interaction Tracking | The backend MUST track authenticated requests per user, platform, and day using an in-memory cache and a 1-minute batch sync worker. |
| ANA-3 | Admin Statistics API | The API MUST expose aggregated signups and platform-specific usage counts (MAU) for global views and user details. |
| ANA-4 | Retroactive Inference | The DB migration MUST infer the platform of existing users from their push notification logs (`device_tokens`). |

---

### Requirement: ANA-1 (Registration Capture)

#### Scenario: Web Signup
- GIVEN a signup request with a standard browser User-Agent
- WHEN the endpoint `/api/auth/register` is hit
- THEN the backend MUST save the user's `registration_platform` as `web`

#### Scenario: App Signup with Header
- GIVEN a signup request with header `X-Client-Platform: ios`
- WHEN the endpoint `/api/auth/register` is hit
- THEN the backend MUST save the user's `registration_platform` as `ios`

---

### Requirement: ANA-2 (Interaction Tracking)

#### Scenario: User Action
- GIVEN an authenticated request from an iOS client
- WHEN the `ActivityTracker` middleware processes the request
- THEN the backend MUST increment the user's iOS interaction count in memory and proceed without querying the database.

#### Scenario: Background Flushing
- GIVEN the background sync worker fires every 60 seconds
- WHEN the worker reads the in-memory buffered metrics
- THEN it MUST upsert the aggregated data to the `user_platforms` table in a single database operation.

---

### Requirement: ANA-3 (Admin API)

#### Scenario: Retrieve Global Stats
- GIVEN an authenticated administrator session
- WHEN requesting `GET /api/admin/stats`
- THEN the response MUST return `registrations_by_platform` and `active_users_by_platform` (active within last 30 days) grouped by platform.

---

### Requirement: ANA-4 (Retroactive Inference)

#### Scenario: Run Migration
- GIVEN an existing user with no registration platform
- WHEN DB migration 060 runs
- THEN the user's `registration_platform` MUST be set to `ios` or `android` if they only have that platform's device tokens, or `unknown` otherwise.
