# Delta for EventKit System Calendar Sync (iOS)

> Platform: **iOS only** (EventKit has no Web/Android equivalent — authorized
> parity exception). Direction is **write-only** (Solennix → system). Strict TDD
> is ACTIVE: scenarios target `EventKitSyncService` (protocol-injected so a test
> double can verify write calls) and `CalendarSyncPreferencesViewModel`.

## ADDED Requirements

### Requirement: Write-Only EventKit Sync Service

`EventKitSyncService` MUST reflect Solennix event create/edit/delete into the
chosen destination calendar ONLY when sync is ON. It MUST be **write-only**:
system-side edits MUST NOT flow back into Solennix. Sync operations MUST be
idempotent, keyed on the EventKit `calendarItemIdentifier` stored per Solennix
event.

#### Scenario: Create/edit/delete reflect to system

- GIVEN sync is ON and a destination calendar is available
- WHEN the user creates, edits, then deletes a Solennix event
- THEN the service MUST create, update, then delete the corresponding system item
- AND each operation MUST be idempotent on repeat (no duplicate items)

#### Scenario: System-side edits do not flow back

- GIVEN sync is ON and an event is already synced to the system
- WHEN the user edits the event directly in Apple Calendar (system side)
- THEN the Solennix event MUST remain unchanged on the next Solennix load

### Requirement: Sync Master Toggle and Permission Handling

A master toggle MUST act as both the opt-in/out switch and the EventKit
permission re-prompt surface. When permission is denied, the toggle MUST guide
the user to system Settings and sync MUST be skipped while the **visual**
Calendario mode remains fully usable (graceful degradation).

#### Scenario: Toggle ON enables writes

- GIVEN sync is OFF and EventKit permission is authorized
- WHEN the user turns the master toggle ON
- THEN subsequent event CRUD MUST be written to the system calendar

#### Scenario: Permission denied degrades gracefully

- GIVEN EventKit permission is denied
- WHEN the user toggles sync ON
- THEN the UI MUST guide the user to system Settings
- AND sync MUST be skipped (no system writes)
- AND the visual `.calendario` mode MUST still render and filter events normally

### Requirement: Binary Destination Calendar Selection

The destination selector MUST offer exactly two options: "Solennix" (a dedicated,
app-managed calendar — DEFAULT) and "Personal" (the user's default system
calendar). Selecting "Personal" MUST display a write-only unidirectional
transparency warning.

#### Scenario: Default destination is Solennix

- GIVEN sync has never been configured
- WHEN the user opens calendar sync preferences
- THEN "Solennix" MUST be the selected destination

#### Scenario: Personal selection shows write-only warning

- GIVEN sync preferences open
- WHEN the user selects "Personal"
- THEN a write-only unidirectional warning MUST be displayed

### Requirement: Implicit Sync on Each CRUD

When the master toggle is ON, every create/edit/delete MUST be synced implicitly.
The UI MUST NOT expose a separate "Sync now" action.

#### Scenario: No explicit sync action is required

- GIVEN sync is ON and a destination is available
- WHEN the user edits an event
- THEN the change MUST reach the system calendar with no manual sync step

### Requirement: Destination Change Auto-Migration

Switching the destination MUST migrate every previously-synced event: delete from
the old destination and create in the new one. Migration MUST run as a background
task, MUST NOT block the UI, and MUST surface progress.

#### Scenario: Switching destination moves all synced events

- GIVEN several events are synced to the "Solennix" destination
- WHEN the user switches the destination to "Personal"
- THEN every synced event MUST be deleted from "Solennix"
- AND every event MUST be created in "Personal"
- AND the UI MUST remain responsive with progress surfaced during the move

### Requirement: Missing Calendar Resilience

The system MUST recover from a missing destination calendar. If "Solennix" is
missing while sync is ON, the service MUST recreate it. If "Personal" is missing,
the system MUST surface an error and ask the user to re-choose a destination in
Settings.

#### Scenario: Solennix calendar is recreated when missing

- GIVEN sync is ON with destination "Solennix" and that calendar has been deleted
- WHEN a CRUD sync operation runs
- THEN the "Solennix" calendar MUST be recreated and the write MUST succeed

#### Scenario: Personal calendar missing surfaces an error

- GIVEN sync is ON with destination "Personal" and the default system calendar is unavailable
- WHEN a CRUD sync operation runs
- THEN an error MUST be surfaced and the user MUST be asked to re-choose a destination

### Requirement: Calendar Sync Preferences Screen

`CalendarSyncPreferencesView` in Settings MUST replicate the
`NotificationPreferencesView` pattern (`preferenceToggle`, `.tint`, `.solennixRow()`,
and a ViewModel `togglePreference`/`inFlightKeys` contract) to host the master
toggle, the binary destination selector, and the write-only warning.

#### Scenario: Preferences screen mirrors Notification pattern

- GIVEN the user opens calendar sync preferences from Settings
- WHEN the screen renders
- THEN it MUST use `preferenceToggle` for the master toggle, `.solennixRow()` rows,
  and `.tint(SolennixColors.primary)`
- AND in-flight toggles MUST be tracked via `inFlightKeys`
