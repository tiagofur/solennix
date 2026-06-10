# Session and Cache Specification

## Purpose
Define requirements for managing authentication state, plan limits caching, and real-time updates for collaborator timelines and assignments in the web app.

## Requirements

### Requirement: Session Termination Cache Purge
The system MUST clear all query caches when a user session ends.

#### Scenario: Sign Out
- GIVEN a user with cached queries is logged in
- WHEN the user signs out
- THEN the system MUST call `queryClient.clear()` to purge all cached data
- AND redirect the user to the login page

#### Scenario: Unauthorized Event Logout
- GIVEN a user is logged in
- WHEN an API response triggers the `auth:logout` event
- THEN the system MUST call `queryClient.clear()` to purge all cached data

### Requirement: Dynamic Date Calculations for Limits and Metrics
The system MUST resolve the active calendar month dynamically on render.

#### Scenario: Month Boundary Query Update
- GIVEN the application is kept open across a month boundary
- WHEN a new render cycle occurs in a new calendar month
- THEN the system MUST evaluate a new date range based on the new month
- AND update React Query keys, triggering a fresh fetch of plan limits

### Requirement: Collaborator Timeline and Assignment Synchronicity
The system MUST update the collaborator timeline immediately after an assignment response.

#### Scenario: Respond to Assignment Invalidation
- GIVEN a collaborator has pending assignments and a timeline in the cache
- WHEN the collaborator accepts or declines an assignment
- THEN the system MUST invalidate `['staff', 'my-assignments']`, `['staff', 'my-timeline']`, and `['staff', 'availability']` query caches

### Requirement: Coordinator Save Query Invalidation
The system MUST invalidate event and plan limit queries when saving events.

#### Scenario: Event Form Save Invalidation
- GIVEN a coordinator is editing an event
- WHEN the coordinator submits the form and changes are successfully saved via `eventService`
- THEN the system MUST invalidate the `['events']` and `['planLimits']` query caches
