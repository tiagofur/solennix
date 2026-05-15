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
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.auth.ui.BiometricGateScreen
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel
import com.creapolis.solennix.feature.staff.ui.TeamMemberPortalScreen
import com.creapolis.solennix.feature.staff.viewmodel.TeamMemberPortalViewModel
import com.creapolis.solennix.ui.navigation.AdaptiveNavigationRailLayout
import com.creapolis.solennix.ui.navigation.AuthNavHost
import com.creapolis.solennix.ui.navigation.CompactBottomNavLayout
import androidx.fragment.app.FragmentActivity

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
            if (currentUser?.role == "team_member") {
                TeamMemberPortalScreen(
                    viewModel = hiltViewModel<TeamMemberPortalViewModel>(),
                    authManager = authViewModel.authManager
                )
            } else if (windowSizeClass != null && windowSizeClass.widthSizeClass != WindowWidthSizeClass.Compact) {
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
