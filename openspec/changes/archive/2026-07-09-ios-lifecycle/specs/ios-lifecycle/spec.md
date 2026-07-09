# ios-lifecycle Specification

## Purpose

Scene state restoration and seamless launch for the iOS app: remember where the
user was across a cold relaunch (tab + per-tab nav stacks + iPad sidebar), never
leak one user's restored state to another, and launch with no blank frame.
Sprint 3 (PR-A launch, PR-B restoration).

## Requirements

### Requirement: Route Codable

`Route` SHALL conform to `Codable`. Encode→decode of any `Route` MUST preserve
identity with no data loss. A malformed persisted payload MUST fail to decode
gracefully without crashing.

#### Scenario: Round-trip preserves identity

- GIVEN a `Route` value with associated values (e.g. `eventDetail(id:)`)
- WHEN it is encoded to data and decoded back to a `Route`
- THEN the decoded value equals the original
- AND every case round-trips without data loss

#### Scenario: Malformed payload degrades gracefully

- GIVEN a corrupted `Route` payload persisted in scene storage
- WHEN the app decodes it on launch
- THEN decoding fails gracefully and falls back to an empty stack
- AND no crash occurs

### Requirement: State Restoration

On cold launch, after authentication, the app MUST restore the previously
selected tab and full per-tab `NavigationPath` (compact layout) plus the sidebar
section and content path (iPad split). Restoration MUST NOT occur before auth
resolves; restored state MUST NOT bypass auth.

#### Scenario: Cold relaunch restores tab and full stack

- GIVEN the user navigated Events → EventDetail and the app was terminated
- WHEN the app cold-launches and the user authenticates
- THEN the Events tab is selected
- AND the Events stack is restored to EventDetail with full depth

#### Scenario: iPad sidebar restored

- GIVEN an iPad user had a sidebar section and content path selected
- WHEN the app cold-launches post-auth
- THEN the same sidebar section and content path are restored

#### Scenario: Restoration cannot bypass authentication

- GIVEN scene storage holds restored state from a prior session
- WHEN the app cold-launches while the user is unauthenticated
- THEN no restored navigation is presented
- AND restoration applies only within the authenticated branch

### Requirement: Logout Clears State

On logout — including biometric sign-out — the app MUST clear all scene-storage
navigation keys. A subsequent user authenticating MUST start at the default tab
with empty paths; there MUST be no cross-user leakage.

#### Scenario: Logout clears restored state

- GIVEN a user is on a deep restored path (e.g. EventDetail)
- WHEN the user logs out or a biometric sign-out triggers
- THEN all scene-storage navigation keys are cleared
- AND the next cold launch starts at the default tab with empty paths

#### Scenario: No cross-user leakage

- GIVEN user1 logged out after being on a deep path
- WHEN user2 launches and authenticates
- THEN user2 never sees user1's restored navigation

### Requirement: Spotlight Deep-Link Wins Over Restore

A Spotlight deep-link arriving on launch MUST override any restored navigation
path. The existing reset-first deep-link behavior MUST be preserved over a stale
restored path.

#### Scenario: Deep-link overrides restored path

- GIVEN the app launches with a restored Events → EventDetail path AND a Spotlight deep-link targeting a different entity
- WHEN the launch completes
- THEN the Spotlight target is presented
- AND the stale restored path does not win

### Requirement: Stale-Entity Recovery

If a restored route points to an entity deleted since the prior session, the app
MUST pop silently to root rather than crash or show a dead-end screen.

#### Scenario: Restored entity no longer exists

- GIVEN a restored route points to an event deleted since the last session
- WHEN the app restores the path
- THEN the route is popped silently to root
- AND no crash or dead-end screen appears

### Requirement: Launch Experience

The `UILaunchScreen` MUST match the first content frame (logo image + background
colorset) so there is no blank flash at handoff. `SplashView` MUST fade (opacity)
into resolved content rather than hard-swap, and the fade MUST be gated on auth
resolution, not a fixed timer.

#### Scenario: No blank launch flash

- GIVEN the app launches from cold
- WHEN the launch screen hands off to the first content frame
- THEN the transition shows the logo + background colorset with no blank frame
- AND SplashView fades via opacity rather than hard-swapping

#### Scenario: Fade gates on auth resolution

- GIVEN the app is launching and auth state is unresolved
- WHEN auth resolves to authenticated or unauthenticated
- THEN SplashView fades out to the resolved content
- AND the fade is not driven by a fixed-duration timer

## Non-Goals

- iPad multi-window per-scene isolation — deferred (scene-storage only, no keychain).
- Keychain-backed persistence; Sprint 4/5 scope.

## Validation

- **Automated (xcodebuild test):** Route Codable round-trip green; logout-clear test where feasible.
- **Manual (device):** relaunch restores; logout → fresh; Spotlight wins; no blank flash.
