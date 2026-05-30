# Backend API Deprecation Specification

## Purpose
Define the HTTP headers and transition signaling requirements for retired or deprecated API routes and version aliases.

## Requirements

### Requirement: Deprecation Headers
The system MUST return deprecation and sunset headers for deprecated routes.

#### Scenario: Requesting deprecated route alias
- GIVEN a deprecated route alias like `/api/auth/login`
- WHEN a client makes any HTTP request to it
- THEN the response MUST contain the `Deprecation: true` header
- AND the response MUST contain the `Sunset: Wed, 30 Sep 2026 00:00:00 GMT` header
- AND the response MUST contain a `Link` header pointing to the deprecation policy with `rel="deprecation"`

#### Scenario: Requesting non-deprecated route
- GIVEN a versioned active route like `/api/v1/auth/login`
- WHEN a client makes a request to it
- THEN the response MUST NOT contain the `Deprecation` header
- AND the response MUST NOT contain the `Sunset` header
