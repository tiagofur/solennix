package com.creapolis.solennix.feature.settings.viewmodel

import android.content.Context
import com.creapolis.solennix.core.data.LocalCacheManager
import com.creapolis.solennix.core.data.repository.SettingsRepository
import com.creapolis.solennix.core.data.widget.WidgetSyncTrigger
import com.creapolis.solennix.core.model.ThemeConfig
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.settings.billing.BillingManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val authManager = mockk<AuthManager>(relaxed = true)
    private val billingManager = mockk<BillingManager>(relaxed = true)
    private val settingsRepository = mockk<SettingsRepository>(relaxed = true)
    private val localCacheManager = mockk<LocalCacheManager>(relaxed = true)
    private val apiService = mockk<ApiService>()
    private val widgetSyncTrigger = mockk<WidgetSyncTrigger>(relaxed = true)
    private val context = mockk<Context>(relaxed = true)

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        every { settingsRepository.themeConfig } returns MutableStateFlow(ThemeConfig.SYSTEM_DEFAULT)
        every { authManager.currentUser } returns MutableStateFlow(
            User(
                id = "u1",
                email = "ana@example.com",
                name = "Ana",
                preferredLanguage = "es"
            )
        )
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `update theme persists configuration`() = runTest {
        val viewModel = SettingsViewModel(
            authManager = authManager,
            billingManager = billingManager,
            settingsRepository = settingsRepository,
            localCacheManager = localCacheManager,
            apiService = apiService,
            widgetSyncTrigger = widgetSyncTrigger,
            context = context
        )

        viewModel.updateTheme(ThemeConfig.DARK)
        advanceUntilIdle()

        coVerify(exactly = 1) { settingsRepository.setThemeConfig(ThemeConfig.DARK) }
    }

    @Test
    fun `logout clears session and cache`() = runTest {
        val viewModel = SettingsViewModel(
            authManager = authManager,
            billingManager = billingManager,
            settingsRepository = settingsRepository,
            localCacheManager = localCacheManager,
            apiService = apiService,
            widgetSyncTrigger = widgetSyncTrigger,
            context = context
        )

        viewModel.logout()
        advanceUntilIdle()

        coVerify(exactly = 1) { billingManager.logout() }
        coVerify(exactly = 1) { authManager.logout() }
        coVerify(exactly = 1) { localCacheManager.clearAll() }
        coVerify(exactly = 1) { widgetSyncTrigger.clearKpiSnapshot() }
        coVerify(exactly = 1) { widgetSyncTrigger.refreshAllUnconditional() }
    }
}