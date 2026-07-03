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
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import com.creapolis.solennix.core.data.locale.AppLocaleManager
import com.creapolis.solennix.core.data.locale.LanguageReporter
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

    @Inject
    lateinit var languageReporter: LanguageReporter

    private var deepLinkIntent by mutableStateOf<Intent?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        // Install the SplashScreen API before super.onCreate(). On Android 12+ this drives the
        // system splash with our animated icon; on older versions the core-splashscreen backport
        // draws an equivalent static splash. Either way the post-splash theme (Theme.Solennix)
        // is applied automatically.
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

        // Animate the splash icon out (scale + fade) instead of the default hard dismissal.
        // On API < 31 there is no iconView, so this degrades gracefully to the default behavior.
        splashScreen.setOnExitAnimationListener { splashScreenViewProvider ->
            val iconView = splashScreenViewProvider.iconView
            iconView.animate()
                .scaleX(1.1f)
                .scaleY(1.1f)
                .alpha(0f)
                .setDuration(280L)
                .setInterpolator(android.view.animation.PathInterpolator(0.4f, 0f, 0.2f, 1f))
                .withEndAction { splashScreenViewProvider.remove() }
                .start()
        }

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

        lifecycleScope.launch {
            // Revert per-app language overrides, returning app to system locale
            AppLocaleManager.applyLanguage(this@MainActivity, "")

            authManager.authState.collect { authState ->
                if (authState == AuthManager.AuthState.Authenticated) {
                    languageReporter.reportIfNeeded()
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
