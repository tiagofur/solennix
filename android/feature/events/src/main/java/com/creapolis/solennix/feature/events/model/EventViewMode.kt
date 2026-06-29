package com.creapolis.solennix.feature.events.model

/**
 * View mode for the unified Events screen.
 * Determines whether events display as a list or in a calendar grid.
 */
enum class EventViewMode {
    /** List view - displays events in scrollable card grid */
    LIST,

    /** Calendar view - displays monthly calendar with event indicators */
    CALENDAR
}
