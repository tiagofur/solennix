package com.creapolis.solennix.ui.navigation

import com.creapolis.solennix.R
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class TopLevelDestinationTest {

    @Test
    fun `top level destinations keep the expected route order`() {
        assertEquals(
            listOf("home", "calendar", "events", "clients", "more"),
            TopLevelDestination.entries.map { it.route }
        )
    }

    @Test
    fun `top level destinations keep the expected labels`() {
        assertEquals(
            listOf(
                R.string.nav_home,
                R.string.nav_calendar,
                R.string.nav_events,
                R.string.nav_clients,
                R.string.nav_more
            ),
            TopLevelDestination.entries.map { it.labelRes }
        )
    }
}
