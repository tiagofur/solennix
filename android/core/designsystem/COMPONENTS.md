# Solennix Android Design System Components

This document catalogs all reusable UI components in the `core/designsystem` module.

## Components

### Navigation & Layout

#### `SolennixTopAppBar`
Standard top app bar with search and action buttons.
- **Location**: `component/SolennixTopAppBar.kt`
- **Usage**: Main screens with search functionality
- **Params**: title, onSearchClick, actions (slot)

#### `SolennixSectionTopAppBar`
Section-specific top app bar variant.
- **Location**: `component/SolennixSectionTopAppBar.kt`
- **Usage**: Detail screens and subsections

### Input & Feedback

#### `SolennixTextField`
Styled text input field with Solennix branding.
- **Location**: `component/SolennixTextField.kt`
- **Usage**: Form inputs, search fields

#### `ConfirmDialog`
Standard confirmation dialog.
- **Location**: `component/ConfirmDialog.kt`
- **Usage**: Delete confirmations, critical actions

#### `ToastOverlay`
Toast notification overlay.
- **Location**: `component/ToastOverlay.kt`
- **Usage**: Success/error feedback messages

### Action Components

#### `SwipeRevealActions`
Swipe-to-reveal pattern for list items.
- **Location**: `component/SwipeRevealActions.kt`
- **Usage**: List items with quick actions (delete, edit)

#### `QuickActionsFAB`
Floating action button with expanded actions.
- **Location**: `component/QuickActionsFAB.kt`
- **Usage**: Primary action shortcuts

#### `PremiumButton`
Highlighted call-to-action button.
- **Location**: `component/PremiumButton.kt`
- **Usage**: Upgrade prompts, premium features

### Status & Indicators

#### `StatusBadge`
Event status indicator chip.
- **Location**: `component/StatusBadge.kt`
- **Usage**: Event cards, detail screens
- **Statuses**: quoted, confirmed, completed, cancelled

#### `FeatureDiscoveryTooltip`
Onboarding tooltip for new features.
- **Location**: `component/FeatureDiscoveryTooltip.kt`
- **Usage**: First-run feature highlights

#### `UpgradeBanner`
Upgrade prompt banner.
- **Location**: `component/UpgradeBanner.kt`
- **Usage**: Premium feature gates

### Cards & Displays

#### `KPICard`
Metric display card.
- **Location**: `component/KPICard.kt`
- **Usage**: Dashboard statistics

#### `EmptyState`
Empty state placeholder with icon and message.
- **Location**: `component/EmptyState.kt`
- **Usage**: Empty lists, no results

#### `SkeletonLoading`
Loading skeleton placeholder.
- **Location**: `component/SkeletonLoading.kt`
- **Usage**: Content loading states

#### `Avatar`
User avatar component.
- **Location**: `component/Avatar.kt`
- **Usage**: User profile images

### Modals & Overlays

#### `PaymentModal`
Payment collection modal.
- **Location**: `component/PaymentModal.kt`
- **Usage**: Checkout, payment entry

#### `UpgradePlanDialog`
Plan upgrade dialog.
- **Location**: `component/UpgradePlanDialog.kt`
- **Usage**: Subscription changes

### Toggles & Selection

#### `SingleChoiceSegmentedButtonRow` ⭐ NEW
Material 3 segmented button row for single-choice selection.
- **Location**: `component/SingleChoiceSegmentedButtonRow.kt`
- **Usage**: View toggles, filter switches, mutually exclusive options
- **Example**: List/Calendar view toggle in Events screen
- **Params**:
  - `options: List<String>` - Option labels
  - `selectedIndex: Int` - Currently selected index
  - `onOptionSelected: (Int) -> Unit` - Selection callback
  - `modifier: Modifier` - Optional modifier

**Example Usage:**
```kotlin
var selected by remember { mutableStateOf(0) }
SingleChoiceSegmentedButtonRow(
    options = listOf("Lista", "Calendario"),
    selectedIndex = selected,
    onOptionSelected = { selected = it }
)
```

## Feature-Specific Components (Calendar Module)

These components are currently in `feature/calendar` but will be migrated to `feature/events` during the Events/Calendar unification (Slice 3).

### `CalendarGrid` ⭐ NEW (in feature/events)
Reusable calendar grid component with event indicators and unavailable date highlighting.
- **Location**: `feature/events/ui/CalendarGrid.kt`
- **Usage**: Monthly calendar view in Events screen
- **Features**:
  - 7-column grid layout
  - Event indicator dots (by status)
  - Unavailable date highlighting
  - Date selection tap
  - Long-press for block/unblock dialogs
  - Month navigation
- **Params**:
  - `currentMonth: YearMonth` - Month to display
  - `selectedDate: LocalDate` - Currently selected date
  - `onDateSelected: (LocalDate) -> Unit` - Date tap callback
  - `events: List<Event>` - Events for indicators
  - `unavailableDates: List<UnavailableDate>` - Blocked date ranges
  - `onDateLongPress: (LocalDate) -> Unit` - Long-press callback
  - `modifier: Modifier` - Optional modifier

### `CalendarHeader`
Month navigation header for calendar grid.
- **Location**: `feature/events/ui/CalendarGrid.kt`
- **Usage**: Above CalendarGrid
- **Features**: Previous/next month buttons, "Today" quick button

### Dialogs (to be migrated)
- `BlockDateDialog` - Block unavailable date
- `UnblockDateDialog` - Unblock unavailable date
- `ManageUnavailableDatesSheet` - Bottom sheet for managing blocked dates
- `AddDateRangeDialog` - Add date range block

## Theme Colors

Access via `SolennixTheme.colors`:
- `primary` - Primary brand color
- `primaryLight` - Light variant
- `primaryText` - Main text
- `secondaryText` - Muted text
- `card` - Card background
- `divider` - Border color
- `error` - Error state
- `statusQuoted`, `statusConfirmed`, `statusCompleted`, `statusCancelled` - Event status colors

## Utilities

- `LocalNavScopes` - Navigation scope providers
- `HapticFeedback` - Haptic feedback utilities
- `SolennixTheme` - Theme composition locals

## Documentation Standards

When adding new components:
1. Add KDoc comment describing purpose and usage
2. Include example usage in comments
3. Add entry to this COMPONENTS.md file
4. Follow Material 3 guidelines for styling
5. Support configuration changes (state survival)
6. Include accessibility labels and content descriptions
