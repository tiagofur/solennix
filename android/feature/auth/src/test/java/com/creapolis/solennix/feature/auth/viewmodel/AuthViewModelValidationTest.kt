package com.creapolis.solennix.feature.auth.viewmodel

import android.content.Context
import com.creapolis.solennix.core.model.extensions.isValidEmail
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.model.ApiError
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class AuthViewModelValidationTest {

    private data class Fixture(
        val viewModel: AuthViewModel,
        val apiService: ApiService
    )

    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        mockkStatic("com.creapolis.solennix.core.model.extensions.StringValidationKt")
        every { any<String>().isValidEmail() } answers { firstArg<String>().contains("@") }
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
        every { appContext.getString(any()) } returns ""
        every { appContext.getString(any(), *anyVararg()) } returns ""

        return Fixture(
            viewModel = AuthViewModel(
                appContext = appContext,
                authManager = authManager,
                apiService = apiService
            ),
            apiService = apiService
        )
    }

    private fun createViewModel(): AuthViewModel {
        return createFixture().viewModel
    }

    @Test
    fun `isLoginValid requires valid email and non blank password`() {
        val vm = createViewModel()

        vm.loginEmail = "user@example.com"
        vm.loginPassword = "123456"
        assertTrue(vm.isLoginValid)

        vm.loginEmail = "invalid-email"
        assertFalse(vm.isLoginValid)

        vm.loginEmail = "user@example.com"
        vm.loginPassword = ""
        assertFalse(vm.isLoginValid)
    }

    @Test
    fun `isRegisterValid requires name email password complexity and matching confirmation`() {
        val vm = createViewModel()

        vm.registerName = "Juan"
        vm.registerEmail = "juan@example.com"
        vm.registerPassword = "StrongPass1"
        vm.registerConfirmPassword = "StrongPass1"
        assertTrue(vm.isRegisterValid)

        vm.registerPassword = "weak"
        vm.registerConfirmPassword = "weak"
        assertFalse(vm.isRegisterValid)

        vm.registerPassword = "StrongPass1"
        vm.registerConfirmPassword = "Different1"
        assertFalse(vm.isRegisterValid)
    }

    @Test
    fun `login returns early when credentials are invalid`() {
        val vm = createViewModel()

        vm.loginEmail = "bad-email"
        vm.loginPassword = ""

        vm.login()

        assertFalse(vm.isLoading)
        assertNull(vm.errorMessage)
    }

    @Test
    fun `register returns early when form is invalid`() {
        val vm = createViewModel()

        vm.registerName = "A"
        vm.registerEmail = "invalid"
        vm.registerPassword = "123"
        vm.registerConfirmPassword = "456"

        vm.register()

        assertFalse(vm.isLoading)
        assertNull(vm.errorMessage)
    }

    @Test
    fun `forgotPassword returns early when email is invalid`() {
        val vm = createViewModel()

        vm.forgotEmail = "invalid"

        vm.forgotPassword()

        assertFalse(vm.isLoading)
        assertFalse(vm.forgotSuccess)
        assertNull(vm.errorMessage)
    }

    @Test
    fun `resetPassword returns early when password complexity is invalid`() {
        val vm = createViewModel()

        vm.resetToken = "token"
        vm.newPassword = "weak"
        vm.confirmNewPassword = "weak"

        vm.resetPassword()

        assertFalse(vm.isLoading)
        assertFalse(vm.resetSuccess)
        assertNull(vm.errorMessage)
    }

    @Test
    fun `login maps api error to user message`() = runTest {
        val fixture = createFixture()
        val vm = fixture.viewModel

        vm.loginEmail = "pending@example.com"
        vm.loginPassword = "StrongPass1"

        coEvery {
            fixture.apiService.post<Any>(any(), any(), any())
        } throws ApiError.Unauthorized

        vm.login()
        advanceUntilIdle()

        assertNull(vm.verificationNotice)
        assertNotNull(vm.errorMessage)
        assertFalse(vm.isLoading)
    }

    @Test
    fun `resendVerificationEmail requires a valid email`() {
        val vm = createViewModel()

        vm.verificationEmail = "invalid"
        vm.resendVerificationEmail()

        assertFalse(vm.isLoading)
        assertNotNull(vm.errorMessage)
    }

    @Test
    fun `resendVerificationEmail updates notice when request succeeds`() = runTest {
        val fixture = createFixture()
        val vm = fixture.viewModel
        vm.verificationEmail = "pending@example.com"

        coEvery {
            fixture.apiService.post<Any>(Endpoints.VERIFY_EMAIL_RESEND, any(), any())
        } returns Unit

        vm.resendVerificationEmail()
        advanceUntilIdle()

        assertFalse(vm.isLoading)
        assertNull(vm.errorMessage)
        assertNotNull(vm.verificationNotice)
    }
}