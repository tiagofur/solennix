package com.creapolis.solennix.feature.calendar.ui

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.calendar.R
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarUiState
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarViewModel
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CalendarScreenSmokeTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun calendarScreen_rendersChromeWithoutLocalCreateEventFab() {
        val viewModel = mockk<CalendarViewModel>(relaxed = true)

        every { viewModel.uiState } returns MutableStateFlow(
            CalendarUiState(isLoading = false)
        )
        every { viewModel.error } returns MutableStateFlow(null)
        every { viewModel.isExportingCalendar } returns MutableStateFlow(false)
        every { viewModel.exportIcalResult } returns MutableSharedFlow()
        every { viewModel.refresh() } just runs
        every { viewModel.clearError() } just runs

        composeRule.setContent {
            SolennixTheme {
                CalendarScreen(
                    viewModel = viewModel,
                    onEventClick = {},
                    onCreateEventClick = {},
                    onSearchClick = {}
                )
            }
        }

        val title = composeRule.activity.getString(R.string.calendar_title)
        val allFilter = composeRule.activity.getString(R.string.calendar_filter_all)
        val emptyMessage = composeRule.activity.getString(R.string.calendar_no_events_scheduled)
        val newEvent = composeRule.activity.getString(R.string.calendar_new_event)

        composeRule.onNodeWithText(title).assertIsDisplayed()
        composeRule.onNodeWithText(allFilter).assertIsDisplayed()
        composeRule.onNodeWithText(emptyMessage).assertIsDisplayed()
        composeRule.onAllNodesWithText(newEvent).assertCountEquals(0)
    }
}
