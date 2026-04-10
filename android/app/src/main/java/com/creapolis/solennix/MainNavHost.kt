package com.creapolis.solennix

import android.content.Intent
import android.net.Uri
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
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.auth.ui.BiometricGateScreen
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel
import com.creapolis.solennix.ui.navigation.AdaptiveNavigationRailLayout
import com.creapolis.solennix.ui.navigation.AuthNavHost
import com.creapolis.solennix.ui.navigation.CompactBottomNavLayout
import androidx.fragment.app.FragmentActivity

/**
 * Extrae la ruta de navegacion inicial desde un deep link intent.
 * Soporta:
 *   solennix://client/{id}, solennix://event/{id}, solennix://product/{id}, solennix://inventory/{id}
 *   solennix://new-event, solennix://calendar, solennix://quick-quote, solennix://settings, solennix://pricing
 */
private fun parseAppDeepLinkRoute(intent: Intent?): String? {
    val uri = intent?.data ?: return null
    if (uri.scheme != "solennix") return null

    val host = uri.host ?: return null
    val pathId = uri.pathSegments?.firstOrNull()
    val pathAction = uri.pathSegments?.getOrNull(1)
    val queryClientId = uri.getQueryParameter("clientId")
    val query = uri.getQueryParameter("query") ?: uri.getQueryParameter("q")

    return when (host) {
        "client" -> pathId?.let { "client_detail/$it" }
        "event" -> {
            if (pathId.isNullOrBlank()) {
                null
            } else {
                when (pathAction) {
                    null, "complete" -> "event_detail/$pathId"
                    "checklist" -> "event_checklist/$pathId"
                    "finances" -> "event_finances/$pathId"
                    "payments" -> "event_payments/$pathId"
                    "products" -> "event_products/$pathId"
                    "extras" -> "event_extras/$pathId"
                    "equipment" -> "event_equipment/$pathId"
                    "supplies" -> "event_supplies/$pathId"
                    "shopping" -> "event_shopping/$pathId"
                    "photos" -> "event_photos/$pathId"
                    "contract" -> "event_contract/$pathId"
                    else -> "event_detail/$pathId"
                }
            }
        }
        "product" -> pathId?.let { "product_detail/$it" }
        "inventory" -> pathId?.let { "inventory_detail/$it" }
        "new-event" -> "event_form?eventId="
        "calendar" -> "calendar"
        "settings" -> "settings"
        "pricing" -> "pricing"
        "search" -> if (query.isNullOrBlank()) "search?query=" else "search?query=${Uri.encode(query)}"
        "quick-quote" -> {
            val clientId = queryClientId ?: pathId
            if (clientId.isNullOrBlank()) "quick_quote?clientId=" else "quick_quote?clientId=${Uri.encode(clientId)}"
        }
        else -> null
    }
}

private fun parseAuthDeepLinkRoute(intent: Intent?): String? {
    val uri = intent?.data ?: return null
    if (uri.scheme != "solennix") return null
    if (uri.host != "reset-password") return null

    val token = uri.getQueryParameter("token")
    return if (token.isNullOrBlank()) {
        "reset-password?token="
    } else {
        "reset-password?token=${Uri.encode(token)}"
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

    val appDeepLinkRoute = remember(deepLinkIntent) { parseAppDeepLinkRoute(deepLinkIntent) }
    val authDeepLinkRoute = remember(deepLinkIntent) { parseAuthDeepLinkRoute(deepLinkIntent) }

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
            AuthNavHost(
                initialRoute = authDeepLinkRoute,
                onAuthenticated = {
                    // Force re-evaluation of auth state as a safety net.
                    // storeTokens already sets Authenticated, but this ensures
                    // MainNavHost recomposes even if the StateFlow update was missed.
                    authViewModel.refreshAuthState()
                }
            )
        }
        AuthManager.AuthState.BiometricLocked -> {
            val isWideScreen = windowSizeClass != null &&
                windowSizeClass.widthSizeClass != WindowWidthSizeClass.Compact
            BiometricGateScreen(
                authManager = authViewModel.authManager,
                isWideScreen = isWideScreen
            )
        }
        AuthManager.AuthState.Authenticated -> {
            val currentUser by authViewModel.authManager.currentUser.collectAsStateWithLifecycle()
            if (windowSizeClass != null && windowSizeClass.widthSizeClass != WindowWidthSizeClass.Compact) {
                AdaptiveNavigationRailLayout(
                    initialDeepLinkRoute = appDeepLinkRoute,
                    currentUser = currentUser
                )
            } else {
                CompactBottomNavLayout(initialDeepLinkRoute = appDeepLinkRoute)
            }
        }
    }
}
