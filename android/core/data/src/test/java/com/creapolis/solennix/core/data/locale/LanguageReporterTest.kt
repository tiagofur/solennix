package com.creapolis.solennix.core.data.locale

import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.put
import android.util.Log
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class LanguageReporterTest {

    private val mockStore = mockk<LanguageReportStoring>(relaxed = true)
    private val mockAuthManager = mockk<AuthManager>(relaxed = true)
    private val mockApiService = mockk<ApiService>(relaxed = true)

    private lateinit var reporter: LanguageReporter

    @BeforeEach
    fun setUp() {
        mockkStatic(Log::class)
        every { Log.e(any(), any(), any()) } returns 0
        every { Log.e(any(), any()) } returns 0

        reporter = LanguageReporter(
            store = mockStore,
            authManager = mockAuthManager,
            apiService = mockApiService
        )
    }

    @AfterEach
    fun tearDown() {
        unmockkStatic(Log::class)
    }

    @Test
    fun `reportIfNeeded does not report if language and currency are identical to last reported`() = runTest {
        reporter.currentLanguageProvider = { "en" }
        reporter.currentCurrencyProvider = { "USD" }
        every { mockStore.getLastReportedLanguage() } returns "en"
        every { mockStore.getLastReportedCurrency() } returns "USD"

        val reported = reporter.reportIfNeeded()

        assertFalse(reported)
        coVerify(exactly = 0) { mockApiService.put<User>(any(), any()) }
    }

    @Test
    fun `reportIfNeeded reports and updates store on language change`() = runTest {
        reporter.currentLanguageProvider = { "en" }
        reporter.currentCurrencyProvider = { "USD" }
        every { mockStore.getLastReportedLanguage() } returns "es"
        every { mockStore.getLastReportedCurrency() } returns "USD"

        val updatedUser = User(id = "1", email = "test@example.com", name = "Test", preferredLanguage = "en")
        coEvery { mockApiService.put<User>(any(), any()) } returns updatedUser

        val reported = reporter.reportIfNeeded()

        assertTrue(reported)
        coVerify(exactly = 1) { mockApiService.put<User>(any(), any()) }
        coVerify(exactly = 1) { mockAuthManager.storeUser(updatedUser) }
        verify(exactly = 1) { mockStore.setLastReportedLanguage("en") }
        verify(exactly = 1) { mockStore.setLastReportedCurrency("USD") }
    }

    @Test
    fun `reportIfNeeded reports and updates store on currency change`() = runTest {
        reporter.currentLanguageProvider = { "en" }
        reporter.currentCurrencyProvider = { "COP" }
        every { mockStore.getLastReportedLanguage() } returns "en"
        every { mockStore.getLastReportedCurrency() } returns "USD"

        val updatedUser = User(id = "1", email = "test@example.com", name = "Test", preferredLanguage = "en")
        coEvery { mockApiService.put<User>(any(), any()) } returns updatedUser

        val reported = reporter.reportIfNeeded()

        assertTrue(reported)
        coVerify(exactly = 1) { mockApiService.put<User>(any(), any()) }
        coVerify(exactly = 1) { mockAuthManager.storeUser(updatedUser) }
        verify(exactly = 1) { mockStore.setLastReportedLanguage("en") }
        verify(exactly = 1) { mockStore.setLastReportedCurrency("COP") }
    }

    @Test
    fun `reportIfNeeded returns false and does not update store on network failure`() = runTest {
        reporter.currentLanguageProvider = { "en" }
        reporter.currentCurrencyProvider = { "USD" }
        every { mockStore.getLastReportedLanguage() } returns "es"
        every { mockStore.getLastReportedCurrency() } returns "USD"

        coEvery { mockApiService.put<User>(any(), any()) } throws RuntimeException("Network Error")

        val reported = reporter.reportIfNeeded()

        assertFalse(reported)
        coVerify(exactly = 1) { mockApiService.put<User>(any(), any()) }
        coVerify(exactly = 0) { mockAuthManager.storeUser(any()) }
        verify(exactly = 0) { mockStore.setLastReportedLanguage(any()) }
        verify(exactly = 0) { mockStore.setLastReportedCurrency(any()) }
    }
}
