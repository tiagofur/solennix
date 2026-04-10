package com.creapolis.solennix.ui.navigation

import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.creapolis.solennix.feature.auth.ui.ForgotPasswordScreen
import com.creapolis.solennix.feature.auth.ui.LoginScreen
import com.creapolis.solennix.feature.auth.ui.RegisterScreen
import com.creapolis.solennix.feature.auth.ui.ResetPasswordScreen
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
@Composable
fun AuthNavHost(
    initialRoute: String? = null,
    onAuthenticated: () -> Unit = {}
) {
    val navController = rememberNavController()
    val viewModel: AuthViewModel = hiltViewModel()

    val context = LocalContext.current
    val activity = context as? FragmentActivity
    val windowSizeClass = activity?.let { calculateWindowSizeClass(it) }
    val isWideScreen = windowSizeClass != null &&
        windowSizeClass.widthSizeClass != WindowWidthSizeClass.Compact

    LaunchedEffect(initialRoute) {
        initialRoute?.let { route ->
            navController.navigate(route) {
                launchSingleTop = true
            }
        }
    }

    NavHost(navController = navController, startDestination = "login") {
        composable("login") {
            LoginScreen(
                viewModel = viewModel,
                onNavigateToRegister = { navController.navigate("register") },
                onNavigateToForgot = { navController.navigate("forgot") },
                onLoginSuccess = onAuthenticated,
                isWideScreen = isWideScreen
            )
        }
        composable("register") {
            RegisterScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onLoginSuccess = onAuthenticated,
                isWideScreen = isWideScreen
            )
        }
        composable("forgot") {
            ForgotPasswordScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                isWideScreen = isWideScreen
            )
        }
        composable(
            route = "reset-password?token={token}",
            deepLinks = listOf(
                navDeepLink { uriPattern = "solennix://reset-password?token={token}" }
            ),
            arguments = listOf(
                navArgument("token") {
                    type = NavType.StringType
                    nullable = true
                }
            )
        ) { backStackEntry ->
            val token = backStackEntry.arguments?.getString("token")
            ResetPasswordScreen(
                token = token,
                viewModel = viewModel,
                onNavigateToLogin = { navController.navigate("login") },
                isWideScreen = isWideScreen
            )
        }
    }
}
