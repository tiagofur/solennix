package com.creapolis.solennix.feature.dashboard.ui

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollToNode
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.creapolis.solennix.feature.dashboard.R
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.dashboard.viewmodel.DashboardUiState
import com.creapolis.solennix.feature.dashboard.viewmodel.DashboardViewModel
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DashboardScreenSmokeTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun dashboardScreen_rendersTopBarAndQuickActions() {
        val uiState = MutableStateFlow(
            DashboardUiState(
                isLoading = false,
                isRefreshing = false,
                userName = "QA",
                isBasicPlan = true
            )
        )

        val viewModel = mockk<DashboardViewModel>(relaxed = true)
        every { viewModel.uiState } returns uiState
        every { viewModel.refresh() } just runs
        every { viewModel.consumeTransientMessage() } just runs

        composeRule.setContent {
            SolennixTheme {
                DashboardScreen(
                    viewModel = viewModel,
                    onNewEventClick = {},
                    onNewClientClick = {},
                    onSearchClick = {},
                    onUpgradeClick = {},
                    onOnboardingAction = {}
                )
            }
        }

        val title = composeRule.activity.getString(R.string.dashboard_title)
        val quickNewEvent = composeRule.activity.getString(R.string.dashboard_quick_new_event)
        val quickNewClient = composeRule.activity.getString(R.string.dashboard_quick_new_client)

        composeRule.onNodeWithText(title).assertIsDisplayed()
        composeRule.onNodeWithText(quickNewEvent).assertIsDisplayed()
        composeRule.onNodeWithText(quickNewClient).assertIsDisplayed()
    }
    @Test
    fun dashboardScreen_scrollsToBottomAnalyticsWithoutCrashing() {
        val uiState = MutableStateFlow(
            DashboardUiState(
                isLoading = false,
                isRefreshing = false,
                userName = "QA",
                isBasicPlan = true
            )
        )

        val viewModel = mockk<DashboardViewModel>(relaxed = true)
        every { viewModel.uiState } returns uiState
        every { viewModel.refresh() } just runs
        every { viewModel.consumeTransientMessage() } just runs

        composeRule.setContent {
            SolennixTheme {
                DashboardScreen(
                    viewModel = viewModel,
                    onNewEventClick = {},
                    onNewClientClick = {},
                    onSearchClick = {},
                    onUpgradeClick = {},
                    onOnboardingAction = {}
                )
            }
        }

        val forecastTitle = composeRule.activity.getString(R.string.dashboard_widget_forecast_title)
        val forecastEmpty = composeRule.activity.getString(R.string.dashboard_widget_forecast_empty)

        composeRule.onNodeWithTag("dashboard_content").performScrollToNode(hasText(forecastTitle))
        composeRule.onNodeWithText(forecastTitle).assertIsDisplayed()
        composeRule.onNodeWithText(forecastEmpty).assertIsDisplayed()
    }

}
