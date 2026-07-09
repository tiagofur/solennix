# Delta for Navigation (iOS)

> Platform: **iOS only**. Touches `Route.swift` (`Tab`, `SidebarSection`,
> `CompactTabLayout`, `SidebarSplitLayout`) and Settings entry points. Strict TDD
> is ACTIVE: scenarios assert on the `Tab` enum, `SidebarSection` enum, and the
> rendered navigation surfaces.

## MODIFIED Requirements

### Requirement: Tab Bar and Sidebar Sections

The navigation surface MUST expose exactly four destinations — `home`, `events`,
`clients`, `more` — in both the compact tab bar (`CompactTabLayout`) and the
sidebar (`SidebarSplitLayout`). The Calendar destination MUST NOT exist as a tab
or a sidebar section.
(Previously: five destinations including a `calendar` tab and a
`SidebarSection.calendar`.)

#### Scenario: Compact layout shows four tabs with no Calendar

- GIVEN the app launches on iPhone (compact layout)
- WHEN `CompactTabLayout` renders
- THEN the tabs MUST be exactly `home`, `events`, `clients`, `more`
- AND no `calendar` tab MUST be present

#### Scenario: Sidebar layout has no Calendar section

- GIVEN the app launches on iPad (sidebar layout)
- WHEN `SidebarSplitLayout` renders
- THEN the sections MUST NOT include `calendar`
- AND navigation MUST NOT resolve any `calendar` destination

## ADDED Requirements

### Requirement: Calendar Sync Preferences Navigation Route

`Route.calendarSyncPreferences` MUST exist and Settings MUST expose a section/link
that navigates to `CalendarSyncPreferencesView`.

#### Scenario: Settings exposes the calendar sync entry

- GIVEN the user opens Settings
- WHEN the Settings list renders
- THEN a calendar sync section/link MUST be present
- WHEN the user selects it
- THEN navigation MUST push `Route.calendarSyncPreferences` rendering
  `CalendarSyncPreferencesView`
