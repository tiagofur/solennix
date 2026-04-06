package com.creapolis.solennix.core.network

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import com.creapolis.solennix.core.model.TokenPair
import com.creapolis.solennix.core.model.User
import dagger.hilt.android.qualifiers.ApplicationContext
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.auth.providers.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthManager @Inject constructor(
    private val encryptedPrefs: SharedPreferences,
    @ApplicationContext private val context: Context
) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Unknown)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val refreshMutex = Mutex()

    private val json = Json { ignoreUnknownKeys = true }

    // Dedicated refresh client to avoid circular dependency
    private val refreshHttpClient = HttpClient {
        install(ContentNegotiation) {
            json(json)
        }
    }

    private companion object {
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_USER_JSON = "current_user"
        const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        const val KEY_FCM_TOKEN = "fcm_token"
    }

    sealed class AuthState {
        data object Unknown : AuthState()
        data object Authenticated : AuthState()
        data object Unauthenticated : AuthState()
        data object BiometricLocked : AuthState()
    }

    suspend fun restoreSession() {
        if (_authState.value == AuthState.Authenticated) return

        val accessToken = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        val refreshToken = encryptedPrefs.getString(KEY_REFRESH_TOKEN, null)

        if (accessToken == null || refreshToken == null) {
            _authState.value = AuthState.Unauthenticated
            return
        }

        val biometricEnabled = encryptedPrefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)
        if (biometricEnabled && isBiometricAvailable()) {
            _authState.value = AuthState.BiometricLocked
            return
        }

        _authState.value = AuthState.Authenticated
        loadCachedUser()
    }

    fun storeTokens(accessToken: String, refreshToken: String) {
        encryptedPrefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .commit()
        _authState.value = AuthState.Authenticated
    }

    fun storeUser(user: User) {
        val userJson = json.encodeToString(User.serializer(), user)
        encryptedPrefs.edit().putString(KEY_USER_JSON, userJson).commit()
        _currentUser.value = user
    }

    private fun loadCachedUser() {
        val userJson = encryptedPrefs.getString(KEY_USER_JSON, null)
        if (userJson != null) {
            try {
                _currentUser.value = json.decodeFromString(User.serializer(), userJson)
            } catch (e: Exception) {
                _currentUser.value = null
            }
        }
    }

    fun getBearerTokens(): BearerTokens? {
        val accessToken = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        val refreshToken = encryptedPrefs.getString(KEY_REFRESH_TOKEN, null)
        return if (accessToken != null && refreshToken != null) {
            BearerTokens(accessToken, refreshToken)
        } else null
    }

    suspend fun refreshAndGetTokens(): BearerTokens? {
        return refreshMutex.withLock {
            val refreshToken = encryptedPrefs.getString(KEY_REFRESH_TOKEN, null) ?: return null

            try {
                val response: TokenPair = refreshHttpClient.post(BuildConfig.API_BASE_URL + Endpoints.REFRESH) {
                    contentType(ContentType.Application.Json)
                    setBody(mapOf("refresh_token" to refreshToken))
                }.body()

                storeTokens(response.accessToken, response.refreshToken)
                BearerTokens(response.accessToken, response.refreshToken)
            } catch (e: ClientRequestException) {
                // 4xx from server = refresh token rejected → clear session
                Log.w("AuthManager", "Token refresh rejected by server: ${e.response.status}", e)
                clearTokens()
                null
            } catch (e: Exception) {
                // Network/timeout/other transient error → keep tokens, just return null
                Log.w("AuthManager", "Token refresh failed (transient): ${e.message}", e)
                null
            }
        }
    }

    suspend fun logout() {
        try {
            refreshHttpClient.post(BuildConfig.API_BASE_URL + Endpoints.LOGOUT) {
                val tokens = getBearerTokens()
                if (tokens != null) {
                    bearerAuth(tokens.accessToken)
                }
            }
        } catch (e: Exception) {
            // Ignore logout failure
        } finally {
            clearTokens()
        }
    }

    fun clearTokens() {
        encryptedPrefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_USER_JSON)
            .commit()
        _currentUser.value = null
        _authState.value = AuthState.Unauthenticated
    }

    fun isBiometricAvailable(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun unlockWithBiometric() {
        _authState.value = AuthState.Authenticated
        loadCachedUser()
    }

    fun failedBiometric() {
        clearTokens()
    }

    fun setBiometricEnabled(enabled: Boolean) {
        encryptedPrefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).commit()
    }

    fun storeFcmToken(token: String) {
        encryptedPrefs.edit().putString(KEY_FCM_TOKEN, token).apply()
    }

    fun getFcmToken(): String? = encryptedPrefs.getString(KEY_FCM_TOKEN, null)
}
