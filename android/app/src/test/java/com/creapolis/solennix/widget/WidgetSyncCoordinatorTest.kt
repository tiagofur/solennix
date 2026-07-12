package com.creapolis.solennix.widget

import android.content.Context
import android.content.SharedPreferences
import com.creapolis.solennix.core.network.AuthManager
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/**
 * Unit tests for [WidgetSyncCoordinator]. The Glance layer is abstracted behind a fake
 * [WidgetUpdater] so no Android widget framework is required.
 *
 * Auth gate parity: refreshAll() must be a no-op when signed out (never re-render widgets
 * that could surface another tenant's rows), while refreshAllUnconditional() always
 * refreshes (used after logout's cache wipe to re-render the empty/signed-out state).
 */
class WidgetSyncCoordinatorTest {

    private lateinit var authManager: AuthManager
    private val mockPrefs = mockk<SharedPreferences>(relaxed = true)
    private val mockContext = mockk<Context>(relaxed = true)
    private val mockEditor = mockk<SharedPreferences.Editor>(relaxed = true)

    @BeforeEach
    fun setUp() {
        // android.util.Log methods are stubs in unit tests — mock the calls the
        // coordinator makes inside its catch block.
        mockkStatic(android.util.Log::class)
        every { android.util.Log.w(any(), any<String>(), any()) } returns 0
        every { mockPrefs.edit() } returns mockEditor
        every { mockEditor.putString(any(), any()) } returns mockEditor
        every { mockEditor.remove(any()) } returns mockEditor
        every { mockEditor.putBoolean(any(), any()) } returns mockEditor
        authManager = AuthManager(mockPrefs, mockContext)
    }

    @AfterEach
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `refreshAll is no-op when signed out`() = runTest {
        val dispatcher = StandardTestDispatcher(testScheduler)
        val updater = RecordingWidgetUpdater()
        val coordinator = WidgetSyncCoordinator(updater, authManager, dispatcher)
        // authState starts as Unknown (signed out)
        coordinator.refreshAll()
        advanceUntilIdle()
        assertFalse(updater.updateAllCalled, "updateAll must NOT be called when signed out")
    }

    @Test
    fun `refreshAll triggers updateAll when authenticated`() = runTest {
        val dispatcher = StandardTestDispatcher(testScheduler)
        val updater = RecordingWidgetUpdater()
        val coordinator = WidgetSyncCoordinator(updater, authManager, dispatcher)
        authManager.storeTokens("access-test", "refresh-test")
        coordinator.refreshAll()
        advanceUntilIdle()
        assertTrue(updater.updateAllCalled, "updateAll must be called when authenticated")
    }

    @Test
    fun `refreshAllUnconditional triggers updateAll even when signed out`() = runTest {
        val dispatcher = StandardTestDispatcher(testScheduler)
        val updater = RecordingWidgetUpdater()
        val coordinator = WidgetSyncCoordinator(updater, authManager, dispatcher)
        coordinator.refreshAllUnconditional()
        advanceUntilIdle()
        assertTrue(updater.updateAllCalled, "updateAll must be called unconditionally")
    }

    @Test
    fun `refreshAll swallows WidgetUpdater failure without throwing`() = runTest {
        val dispatcher = StandardTestDispatcher(testScheduler)
        val failingUpdater = object : WidgetUpdater {
            override suspend fun updateAll() { throw RuntimeException("Glance exploded") }
        }
        val coordinator = WidgetSyncCoordinator(failingUpdater, authManager, dispatcher)
        authManager.storeTokens("access-test", "refresh-test")
        // Must not propagate the exception
        coordinator.refreshAll()
        advanceUntilIdle()
    }

    @Test
    fun `refreshAllUnconditional swallows WidgetUpdater failure without throwing`() = runTest {
        val dispatcher = StandardTestDispatcher(testScheduler)
        val failingUpdater = object : WidgetUpdater {
            override suspend fun updateAll() { throw RuntimeException("Glance exploded") }
        }
        val coordinator = WidgetSyncCoordinator(failingUpdater, authManager, dispatcher)
        coordinator.refreshAllUnconditional()
        advanceUntilIdle()
    }

    /** Simple fake that records whether updateAll was invoked. */
    private class RecordingWidgetUpdater : WidgetUpdater {
        var updateAllCalled = false
        override suspend fun updateAll() {
            updateAllCalled = true
        }
    }
}
