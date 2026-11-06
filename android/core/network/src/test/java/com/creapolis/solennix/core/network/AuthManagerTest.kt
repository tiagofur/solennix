package com.creapolis.solennix.core.network

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.biometric.BiometricManager
import app.cash.turbine.test
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class AuthManagerTest {

    private lateinit var authManager: AuthManager
    private val mockPrefs = mockk<SharedPreferences>(relaxed = true)
    private val mockContext = mockk<Context>(relaxed = true)
    private val mockEditor = mockk<SharedPreferences.Editor>(relaxed = true)

    @BeforeEach
    fun setUp() {
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
    fun `initial state is Unknown`() = runTest {
        assertEquals(AuthManager.AuthState.Unknown, authManager.authState.value)
    }

    @Test
    fun `restoreSession with no tokens sets state to Unauthenticated`() = runTest {
        every { mockPrefs.getString("access_token", null) } returns null
        every { mockPrefs.getString("refresh_token", null) } returns null

        authManager.restoreSession()

        assertEquals(AuthManager.AuthState.Unauthenticated, authManager.authState.value)
    }

    @Test
    fun `restoreSession with tokens sets state to Authenticated`() = runTest {
        every { mockPrefs.getString("access_token", null) } returns "valid_access"
        every { mockPrefs.getString("refresh_token", null) } returns "valid_refresh"
        every { mockPrefs.getBoolean("biometric_enabled", false) } returns false
        every { mockPrefs.getString("current_user", null) } returns
            """{"id":"u1","email":"owner@test.dev","name":"Owner","role":"organizer"}"""

        authManager.restoreSession()

        assertEquals(AuthManager.AuthState.Authenticated, authManager.authState.value)
        assertEquals("u1", authManager.currentUser.value?.id)
    }

    @Test
    fun `restoreSession with corrupt user cache fails closed to Unauthenticated`() = runTest {
        // The /auth/me re-sync logs its failure via android.util.Log, which is
        // unimplemented in JVM unit tests.
        mockkStatic(Log::class)
        every { Log.w(any(), any<String>()) } returns 0
        every { mockPrefs.getString("access_token", null) } returns "valid_access"
        every { mockPrefs.getString("refresh_token", null) } returns "valid_refresh"
        every { mockPrefs.getBoolean("biometric_enabled", false) } returns false
        // Unreadable cache (e.g. User schema change after an app upgrade):
        // the /auth/me re-sync fails in the test environment (no server), so
        // the session must degrade to login instead of a null-user session.
        every { mockPrefs.getString("current_user", null) } returns "{not-json"

        authManager.restoreSession()

        assertEquals(AuthManager.AuthState.Unauthenticated, authManager.authState.value)
        assertEquals(null, authManager.currentUser.value)
    }

    @Test
    fun `restoreSession with tokens and biometric enabled sets state to BiometricLocked`() = runTest {
        // Mock static BiometricManager.from(context)
        mockkStatic(BiometricManager::class)
        val mockBioManager = mockk<BiometricManager>()
        every { BiometricManager.from(any()) } returns mockBioManager
        every { mockBioManager.canAuthenticate(any()) } returns BiometricManager.BIOMETRIC_SUCCESS

        every { mockPrefs.getString("access_token", null) } returns "valid_access"
        every { mockPrefs.getString("refresh_token", null) } returns "valid_refresh"
        every { mockPrefs.getBoolean("biometric_enabled", false) } returns true

        authManager.restoreSession()

        assertEquals(AuthManager.AuthState.BiometricLocked, authManager.authState.value)
    }

    @Test
    fun `storeTokens updates state to Authenticated`() = runTest {
        authManager.storeTokens("new_access", "new_refresh")

        assertEquals(AuthManager.AuthState.Authenticated, authManager.authState.value)
    }

    @Test
    fun `clearTokens updates state to Unauthenticated`() = runTest {
        authManager.clearTokens()

        assertEquals(AuthManager.AuthState.Unauthenticated, authManager.authState.value)
    }
}
