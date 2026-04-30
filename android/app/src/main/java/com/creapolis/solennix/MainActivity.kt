package com.creapolis.solennix

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import com.creapolis.solennix.core.data.locale.AppLocaleManager
import com.creapolis.solennix.core.data.repository.SettingsRepository
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.ThemeConfig
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    @Inject
    lateinit var authManager: AuthManager

    private var deepLinkIntent by mutableStateOf<Intent?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        deepLinkIntent = intent

        // Initial FCM Token registration
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                authManager.storeFcmToken(token)
                lifecycleScope.launch(Dispatchers.IO) {
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
            val appLanguage by settingsRepository.appLanguage.collectAsStateWithLifecycle(initialValue = "")
            val currentUser by authManager.currentUser.collectAsStateWithLifecycle()
            val darkTheme = when (themeConfig) {
                ThemeConfig.LIGHT -> false
                ThemeConfig.DARK -> true
                ThemeConfig.SYSTEM_DEFAULT -> isSystemInDarkTheme()
            }

            LaunchedEffect(appLanguage, currentUser?.preferredLanguage) {
                val resolvedLanguage = appLanguage.ifBlank { currentUser?.preferredLanguage.orEmpty() }
                AppLocaleManager.applyLanguage(this@MainActivity, resolvedLanguage)
            }

            SolennixTheme(darkTheme = darkTheme) {
                MainNavHost(deepLinkIntent = deepLinkIntent)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Trigger recomposition via state — avoids destroying the Compose tree
        deepLinkIntent = intent
    }
}
