package com.creapolis.solennix

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.data.repository.SettingsRepository
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.ThemeConfig
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    @Inject
    lateinit var authManager: AuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initial FCM Token registration
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                authManager.storeFcmToken(token)
                CoroutineScope(Dispatchers.IO).launch {
                    if (authManager.authState.value == AuthManager.AuthState.Authenticated) {
                        settingsRepository.registerFcmToken(token)
                    }
                }
            }
        }

        enableEdgeToEdge()
        setContent {
            val themeConfig by settingsRepository.themeConfig.collectAsStateWithLifecycle(
                initialValue = ThemeConfig.SYSTEM_DEFAULT
            )
            val darkTheme = when (themeConfig) {
                ThemeConfig.LIGHT -> false
                ThemeConfig.DARK -> true
                ThemeConfig.SYSTEM_DEFAULT -> isSystemInDarkTheme()
            }

            SolennixTheme(darkTheme = darkTheme) {
                MainNavHost(deepLinkIntent = intent)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Recomponer con el nuevo intent de deep link
        setContent {
            val themeConfig by settingsRepository.themeConfig.collectAsStateWithLifecycle(
                initialValue = ThemeConfig.SYSTEM_DEFAULT
            )
            val darkTheme = when (themeConfig) {
                ThemeConfig.LIGHT -> false
                ThemeConfig.DARK -> true
                ThemeConfig.SYSTEM_DEFAULT -> isSystemInDarkTheme()
            }

            SolennixTheme(darkTheme = darkTheme) {
                MainNavHost(deepLinkIntent = intent)
            }
        }
    }
}
