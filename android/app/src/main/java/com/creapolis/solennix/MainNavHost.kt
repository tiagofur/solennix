package com.creapolis.solennix

import android.content.Intent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.adaptive.currentWindowSize
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.creapolis.solennix.feature.dashboard.ui.OnboardingScreen
import com.creapolis.solennix.feature.dashboard.ui.hasSeenOnboarding
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.auth.ui.BiometricGateScreen
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel
import com.creapolis.solennix.ui.navigation.AdaptiveNavigationRailLayout
import com.creapolis.solennix.ui.navigation.AuthNavHost
import com.creapolis.solennix.ui.navigation.CompactBottomNavLayout
import androidx.fragment.app.FragmentActivity

/**
 * Extrae la ruta de navegacion inicial desde un deep link intent.
 * Soporta: solennix://client/{id}, solennix://event/{id}, solennix://product/{id}
 */
private fun parseDeepLinkRoute(intent: Intent?): String? {
    val uri = intent?.data ?: return null
    if (uri.scheme != "solennix") return null

    val host = uri.host ?: return null
    val pathId = uri.pathSegments?.firstOrNull() ?: return null

    return when (host) {
        "client" -> "client_detail/$pathId"
        "event" -> "event_detail/$pathId"
        "product" -> "product_detail/$pathId"
        else -> null
    }
}

@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
@Composable
fun MainNavHost(deepLinkIntent: Intent? = null) {
    val context = LocalContext.current
    var showOnboarding by remember { mutableStateOf(!hasSeenOnboarding(context)) }

    if (showOnboarding) {
        OnboardingScreen(
            onComplete = { showOnboarding = false }
        )
        return
    }

    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.authState.collectAsStateWithLifecycle()
    val activity = context as? FragmentActivity
    val windowSizeClass = activity?.let { calculateWindowSizeClass(it) }

    val deepLinkRoute = remember(deepLinkIntent) { parseDeepLinkRoute(deepLinkIntent) }

    LaunchedEffect(Unit) {
        authViewModel.authManager.restoreSession()
    }

    when (authState) {
        AuthManager.AuthState.Unknown -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = SolennixTheme.colors.primary)
            }
        }
        AuthManager.AuthState.Unauthenticated -> {
            AuthNavHost()
        }
        AuthManager.AuthState.BiometricLocked -> {
            BiometricGateScreen(authManager = authViewModel.authManager)
        }
        AuthManager.AuthState.Authenticated -> {
            if (windowSizeClass != null && windowSizeClass.widthSizeClass != WindowWidthSizeClass.Compact) {
                AdaptiveNavigationRailLayout()
            } else {
                CompactBottomNavLayout(initialDeepLinkRoute = deepLinkRoute)
            }
        }
    }
}
