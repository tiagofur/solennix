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
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.revenuecat.purchases.Purchases
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
                val response: AuthResponse = apiService.post<AuthResponse>(
                    Endpoints.LOGIN,
                    mapOf("email" to loginEmail, "password" to loginPassword)
                )
                authManager.storeTokens(response.accessToken, response.refreshToken)
                authManager.storeUser(response.user)
                // Sync RevenueCat user identity for cross-platform subscription recognition
                Purchases.sharedInstance.logInWith(
                    appUserID = response.user.id,
                    onError = { /* non-fatal */ },
                    onSuccess = { _, _ -> }
                )
                _loginSuccess.tryEmit(Unit)
            } catch (e: Exception) {
                errorMessage = when {
                    e.message?.contains("401") == true -> "Email o contrasena incorrectos"
                    e.message?.contains("404") == true -> "Error de configuracion del servidor (404)"
                    else -> "Error de conexion: ${e.localizedMessage}"
                }
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
    val isRegisterValid: Boolean get() = registerName.length >= 2 && 
            registerEmail.isValidEmail() && 
            registerPassword.length >= 6 && 
            registerPassword == registerConfirmPassword

    fun register() {
        if (!isRegisterValid) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val response: AuthResponse = apiService.post<AuthResponse>(
                    Endpoints.REGISTER,
                    mapOf(
                        "name" to registerName,
                        "email" to registerEmail,
                        "password" to registerPassword
                    )
                )
                authManager.storeTokens(response.accessToken, response.refreshToken)
                authManager.storeUser(response.user)
                // TODO: Call Purchases.sharedInstance.logInWith(response.user.id) for RevenueCat.
                _loginSuccess.tryEmit(Unit)
            } catch (e: Exception) {
                errorMessage = "Error al crear la cuenta. Intenta de nuevo."
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
                apiService.post<Unit>(Endpoints.FORGOT_PASSWORD, mapOf("email" to forgotEmail))
                forgotSuccess = true
            } catch (e: Exception) {
                errorMessage = "Error al enviar el enlace. Revisa el correo."
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
        if (newPassword.length < 6 || newPassword != confirmNewPassword) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                apiService.post<Unit>(
                    Endpoints.RESET_PASSWORD,
                    mapOf("token" to resetToken, "password" to newPassword)
                )
                resetSuccess = true
            } catch (e: Exception) {
                errorMessage = "Error al restablecer la contrasena. Enlace invalido o expirado."
            } finally {
                isLoading = false
            }
        }
    }

    fun loginWithGoogle(idToken: String, fullName: String?) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val response: AuthResponse = apiService.post<AuthResponse>(
                    Endpoints.GOOGLE_AUTH,
                    mapOf("id_token" to idToken, "full_name" to fullName)
                )
                authManager.storeTokens(response.accessToken, response.refreshToken)
                authManager.storeUser(response.user)
                // TODO: Call Purchases.sharedInstance.logInWith(response.user.id) for RevenueCat.
                _loginSuccess.tryEmit(Unit)
            } catch (e: Exception) {
                errorMessage = "Error al iniciar sesion con Google"
            } finally {
                isLoading = false
            }
        }
    }
}
