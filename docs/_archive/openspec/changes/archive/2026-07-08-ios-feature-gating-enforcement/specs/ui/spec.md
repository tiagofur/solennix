# Delta for UI (iOS Feature Gating)

## ADDED Requirements

### Requirement: iOS Event Creation Gating
When `isBasicPlan` is true and `eventsThisMonth` reaches or exceeds `PlanLimitsManager.freePlanEventLimit`, new event creation MUST be blocked in the UI.

#### Scenario: Gated Toolbar New Event Button
- GIVEN a user on the Basic plan who has reached the monthly event limit (4 events)
- WHEN the user taps the '+' button in the event list toolbar
- THEN the app redirects the user to the Pricing view (Route.pricing) instead of opening the event creation form.

#### Scenario: Gated Empty State CTA
- GIVEN a user on the Basic plan who has reached the monthly event limit
- WHEN the user taps the 'Crear evento' CTA button in the empty state
- THEN the app redirects the user to the Pricing view (Route.pricing).

#### Scenario: Upgrade Banner Presentation
- GIVEN a user on the Basic plan who has reached the monthly event limit
- WHEN the Event list screen is presented
- THEN an UpgradeBannerView is displayed at the top of the event list.

### Requirement: iOS Custom Branding Gating
When `user?.plan.isPaid` is false, custom branding settings (logo upload and brand color picker) MUST be locked.

#### Scenario: Logo Upload Locked
- GIVEN a user on the Basic plan viewing the Business Settings screen
- WHEN the user tries to upload/change the business logo
- THEN the app presents the Pricing view as a modal sheet instead of opening the photo picker.

#### Scenario: Brand Color Picker Locked
- GIVEN a user on the Basic plan viewing the Business Settings screen
- WHEN the user tries to select a brand color
- THEN the app presents the Pricing view as a modal sheet instead of opening the color picker.
