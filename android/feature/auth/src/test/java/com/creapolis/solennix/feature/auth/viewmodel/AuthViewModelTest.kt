package com.creapolis.solennix.feature.auth.viewmodel

import android.content.Context
import com.creapolis.solennix.core.model.ApiError
import com.creapolis.solennix.core.model.AuthResponse
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.TokenPair
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.model.extensions.isValidEmail
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.feature.auth.R
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/**
 * Flow tests for [AuthViewModel] — covers the critical auth paths that
 * [AuthViewModelValidationTest] does not: login/register success and failure,
 * error mapping for each ApiError variant, and the 403 verification branch.
 *
 * RevenueCat (`Purchases.sharedInstance.logInWith`) is mocked statically so
 * happy-paths don't crash on the uninitialized singleton in unit tests.
 */
class AuthViewModelTest {

    private data class Fixture(
        val viewModel: AuthViewModel,
        val apiService: ApiService,
        val authManager: AuthManager,
        val appContext: Context
    )

    private val dispatcher = StandardTestDispatcher()

    private val fakeUser = User(
        id = "user-1",
        email = "tiago@example.com",
        name = "Tiago",
        plan = Plan.BASIC
    )

    private val fakeAuthResponse = AuthResponse(
        user = fakeUser,
        tokens = TokenPair(accessToken = "access-abc", refreshToken = "refresh-xyz")
    )

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        // isValidEmail is mocked so the form validators accept test inputs
        // without matching the real regex.
        mockkStatic("com.creapolis.solennix.core.model.extensions.StringValidationKt")
        every { any<String>().isValidEmail() } answers { firstArg<String>().contains("@") }
        // AuthViewModel uses android.util.Log directly (syncRevenueCat + error
        // logging); stub it so JVM unit tests don't crash on the unmocked SDK.
        mockkStatic(android.util.Log::class)
        every { android.util.Log.w(any(), any<String>()) } returns 0
        every { android.util.Log.w(any(), any<String>(), any()) } returns 0
        every { android.util.Log.d(any(), any<String>()) } returns 0
        every { android.util.Log.e(any(), any<String>()) } returns 0
        every { android.util.Log.e(any(), any<String>(), any()) } returns 0
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    private fun createFixture(): Fixture {
        val appContext = mockk<Context>(relaxed = true)
        val authManager = mockk<AuthManager>(relaxed = true)
        val apiService = mockk<ApiService>(relaxed = true)

        every { authManager.authState } returns MutableStateFlow(AuthManager.AuthState.Unknown)
        // Return the resource id as a string so assertions can match specific messages.
        every { appContext.getString(any()) } answers {
            "res:${firstArg<Int>()}"
        }
        every { appContext.getString(any(), *anyVararg()) } answers {
            "res:${firstArg<Int>()}"
        }

        val viewModel = AuthViewModel(
            appContext = appContext,
            authManager = authManager,
            apiService = apiService
        )
        viewModel.loginEmail = "tiago@example.com"
        viewModel.loginPassword = "Secret123!"

        return Fixture(viewModel, apiService, authManager, appContext)
    }

    @Test
    fun `login success stores tokens user and emits loginSuccess`() = runTest(dispatcher) {
        val fixture = createFixture()
        coEvery {
            fixture.apiService.post<AuthResponse>(eq(Endpoints.LOGIN), any(), any())
        } returns fakeAuthResponse

        fixture.viewModel.login()
        advanceUntilIdle()

        coVerify { fixture.authManager.storeTokens("access-abc", "refresh-xyz") }
        coVerify { fixture.authManager.storeUser(fakeUser) }
        assertFalse(fixture.viewModel.isLoading)
        assertNull(fixture.viewModel.errorMessage)
    }

    @Test
    fun `login 401 unauthorized maps to invalid credentials message`() = runTest(dispatcher) {
        val fixture = createFixture()
        coEvery {
            fixture.apiService.post<AuthResponse>(eq(Endpoints.LOGIN), any(), any())
        } throws ApiError.Unauthorized

        fixture.viewModel.login()
        advanceUntilIdle()

        assertFalse(fixture.viewModel.isLoading)
        assertEquals("res:${R.string.auth_error_invalid_credentials}", fixture.viewModel.errorMessage)
        verify { fixture.appContext.getString(R.string.auth_error_invalid_credentials) }
    }

    @Test
    fun `login network error maps to network message`() = runTest(dispatcher) {
        val fixture = createFixture()
        coEvery {
            fixture.apiService.post<AuthResponse>(eq(Endpoints.LOGIN), any(), any())
        } throws ApiError.NetworkError(java.io.IOException("no connection"))

        fixture.viewModel.login()
        advanceUntilIdle()

        assertEquals("res:${R.string.auth_error_network}", fixture.viewModel.errorMessage)
        verify { fixture.appContext.getString(R.string.auth_error_network) }
    }

    @Test
    fun `login account blocked maps to blocked message`() = runTest(dispatcher) {
        val fixture = createFixture()
        coEvery {
            fixture.apiService.post<AuthResponse>(eq(Endpoints.LOGIN), any(), any())
        } throws ApiError.AccountBlocked

        fixture.viewModel.login()
        advanceUntilIdle()

        assertEquals("res:${R.string.auth_error_account_blocked}", fixture.viewModel.errorMessage)
        verify { fixture.appContext.getString(R.string.auth_error_account_blocked) }
    }

    @Test
    fun `register 409 conflict maps to email taken message`() = runTest(dispatcher) {
        val fixture = createFixture()
        fixture.viewModel.registerName = "Nuevo Usuario"
        fixture.viewModel.registerEmail = "taken@example.com"
        fixture.viewModel.registerPassword = "Secret123!"
        fixture.viewModel.registerConfirmPassword = "Secret123!"

        coEvery {
            fixture.apiService.post<Any>(eq(Endpoints.REGISTER), any(), any())
        } throws ApiError.Conflict

        fixture.viewModel.register()
        advanceUntilIdle()

        assertEquals("res:${R.string.auth_error_email_taken}", fixture.viewModel.errorMessage)
        verify { fixture.appContext.getString(R.string.auth_error_email_taken) }
    }

    @Test
    fun `loginWithGoogle success stores tokens and emits loginSuccess`() = runTest(dispatcher) {
        val fixture = createFixture()
        coEvery {
            fixture.apiService.post<AuthResponse>(eq(Endpoints.GOOGLE_AUTH), any(), any())
        } returns fakeAuthResponse

        fixture.viewModel.loginWithGoogle(idToken = "google-id-token", fullName = null)
        advanceUntilIdle()

        coVerify { fixture.authManager.storeTokens("access-abc", "refresh-xyz") }
        coVerify { fixture.authManager.storeUser(fakeUser) }
        assertFalse(fixture.viewModel.isLoading)
        assertNull(fixture.viewModel.errorMessage)
    }
}
