package com.creapolis.solennix.feature.auth.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.ApiError
import com.creapolis.solennix.core.model.AuthResponse
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.model.extensions.isValidEmail
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.runCatchingApi
import android.util.Log
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.logInWith
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    val authManager: AuthManager,
    private val apiService: ApiService
) : ViewModel() {

    val authState: StateFlow<AuthManager.AuthState> = authManager.authState

    private val _loginSuccess = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val loginSuccess: SharedFlow<Unit> = _loginSuccess.asSharedFlow()

    // UI State
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    /**
     * Forces a re-evaluation of auth state by calling restoreSession.
     * Used as a safety net when the login success event fires,
     * ensuring MainNavHost picks up the Authenticated state.
     */
    fun refreshAuthState() {
        viewModelScope.launch {
            authManager.restoreSession()
        }
    }

    // Login
    var loginEmail by mutableStateOf("")
    var loginPassword by mutableStateOf("")
    val isLoginValid: Boolean get() = loginEmail.isValidEmail() && loginPassword.isNotBlank()

    fun login() {
        if (!isLoginValid) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val response: AuthResponse = runCatchingApi {
                    apiService.post<AuthResponse>(
                        Endpoints.LOGIN,
                        mapOf("email" to loginEmail, "password" to loginPassword)
                    )
                }
                authManager.storeTokens(response.accessToken, response.refreshToken)
                authManager.storeUser(response.user)
                syncRevenueCat(response.user.id)
                _loginSuccess.tryEmit(Unit)
            } catch (e: ApiError) {
                errorMessage = e.userMessage(context = ErrorContext.LOGIN)
            } finally {
                isLoading = false
            }
        }
    }

    // Register
    var registerName by mutableStateOf("")
    var registerEmail by mutableStateOf("")
    var registerPassword by mutableStateOf("")
    var registerConfirmPassword by mutableStateOf("")
    private val passwordComplexityRegex = Regex("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$")

    val isRegisterValid: Boolean get() = registerName.length >= 2 &&
            registerEmail.isValidEmail() &&
            passwordComplexityRegex.matches(registerPassword) &&
            registerPassword == registerConfirmPassword

    fun register() {
        if (!isRegisterValid) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val response: AuthResponse = runCatchingApi {
                    apiService.post<AuthResponse>(
                        Endpoints.REGISTER,
                        mapOf(
                            "name" to registerName,
                            "email" to registerEmail,
                            "password" to registerPassword
                        )
                    )
                }
                authManager.storeTokens(response.accessToken, response.refreshToken)
                authManager.storeUser(response.user)
                syncRevenueCat(response.user.id)
                _loginSuccess.tryEmit(Unit)
            } catch (e: ApiError) {
                errorMessage = e.userMessage(context = ErrorContext.REGISTER)
            } finally {
                isLoading = false
            }
        }
    }

    // Forgot
    var forgotEmail by mutableStateOf("")
    var forgotSuccess by mutableStateOf(false)

    fun forgotPassword() {
        if (!forgotEmail.isValidEmail()) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                runCatchingApi {
                    apiService.post<Unit>(Endpoints.FORGOT_PASSWORD, mapOf("email" to forgotEmail))
                }
                forgotSuccess = true
            } catch (e: ApiError) {
                errorMessage = e.userMessage(context = ErrorContext.FORGOT_PASSWORD)
            } finally {
                isLoading = false
            }
        }
    }

    // Reset
    var resetToken by mutableStateOf("")
    var newPassword by mutableStateOf("")
    var confirmNewPassword by mutableStateOf("")
    var resetSuccess by mutableStateOf(false)

    fun resetPassword() {
        if (!passwordComplexityRegex.matches(newPassword) || newPassword != confirmNewPassword) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                runCatchingApi {
                    apiService.post<Unit>(
                        Endpoints.RESET_PASSWORD,
                        mapOf("token" to resetToken, "password" to newPassword)
                    )
                }
                resetSuccess = true
            } catch (e: ApiError) {
                errorMessage = e.userMessage(context = ErrorContext.RESET_PASSWORD)
            } finally {
                isLoading = false
            }
        }
    }

    /**
     * Sync RevenueCat user identity for cross-platform subscription recognition.
     *
     * Failures are logged but do NOT block auth — the user can still sign in with an
     * anonymous RevenueCat ID and the next session will retry the sync. We explicitly
     * use `logInWith` (callback-based) instead of the blocking `logIn` so the SDK
     * surfaces errors via `onError` instead of swallowing them in a silent try/catch.
     *
     * If `REVENUECAT_API_KEY` is blank (debug builds), `Purchases.sharedInstance` access
     * throws `IllegalStateException` — we catch that narrowly and log a warning.
     */
    private fun syncRevenueCat(userId: String) {
        try {
            Purchases.sharedInstance.logInWith(
                appUserID = userId,
                onError = { error ->
                    Log.w(
                        TAG,
                        "RevenueCat sync failed for user $userId: ${error.message}. " +
                            "Subscription state may be out of sync until next login. " +
                            "If REVENUECAT_API_KEY is unset this is expected."
                    )
                },
                onSuccess = { _, _ ->
                    Log.d(TAG, "RevenueCat synced for user $userId")
                }
            )
        } catch (e: IllegalStateException) {
            Log.w(TAG, "RevenueCat SDK not configured, skipping sync: ${e.message}")
        }
    }

    private companion object {
        private const val TAG = "AuthViewModel"
    }

    fun loginWithGoogle(idToken: String, fullName: String?) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val response: AuthResponse = runCatchingApi {
                    apiService.post<AuthResponse>(
                        Endpoints.GOOGLE_AUTH,
                        mapOf("id_token" to idToken, "full_name" to fullName)
                    )
                }
                authManager.storeTokens(response.accessToken, response.refreshToken)
                authManager.storeUser(response.user)
                syncRevenueCat(response.user.id)
                _loginSuccess.tryEmit(Unit)
            } catch (e: ApiError) {
                errorMessage = e.userMessage(context = ErrorContext.SOCIAL_LOGIN)
            } finally {
                isLoading = false
            }
        }
    }

    fun loginWithApple(identityToken: String, fullName: String?) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val response: AuthResponse = runCatchingApi {
                    apiService.post<AuthResponse>(
                        Endpoints.APPLE_AUTH,
                        mapOf("identity_token" to identityToken, "full_name" to fullName)
                    )
                }
                authManager.storeTokens(response.accessToken, response.refreshToken)
                authManager.storeUser(response.user)
                syncRevenueCat(response.user.id)
                _loginSuccess.tryEmit(Unit)
            } catch (e: ApiError) {
                errorMessage = e.userMessage(context = ErrorContext.SOCIAL_LOGIN)
            } finally {
                isLoading = false
            }
        }
    }
}

/** Context-specific error messages for auth operations */
private enum class ErrorContext {
    LOGIN,
    REGISTER,
    FORGOT_PASSWORD,
    RESET_PASSWORD,
    SOCIAL_LOGIN
}

/** Maps [ApiError] to a user-facing Spanish message depending on the auth operation context. */
private fun ApiError.userMessage(context: ErrorContext): String = when (this) {
    is ApiError.Unauthorized -> when (context) {
        ErrorContext.LOGIN -> "Email o contraseña incorrectos"
        ErrorContext.RESET_PASSWORD -> "Enlace inválido o expirado"
        else -> "Sesión expirada. Iniciá sesión de nuevo."
    }
    is ApiError.Conflict -> when (context) {
        ErrorContext.REGISTER -> "Ya existe una cuenta con este email"
        else -> "Conflicto con los datos enviados. Intentá de nuevo."
    }
    is ApiError.Forbidden -> "No tenés permisos para realizar esta acción."
    is ApiError.NotFound -> "Servicio no disponible. Intentá más tarde."
    is ApiError.ValidationError -> "Datos inválidos. Revisá los campos e intentá de nuevo."
    is ApiError.NetworkError -> "Error de conexión. Verificá tu internet."
    is ApiError.ServerError -> "Error del servidor. Intentá más tarde."
    is ApiError.DecodingError -> "Error inesperado. Intentá de nuevo."
    is ApiError.SecurityError ->
        "No pudimos verificar la conexión segura con el servidor. " +
            "Posible red comprometida. Intentá desde otra red."
    is ApiError.Unknown -> "Error inesperado. Intentá de nuevo."
}
