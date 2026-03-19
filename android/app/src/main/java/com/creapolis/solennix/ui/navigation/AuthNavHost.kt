package com.creapolis.solennix.ui.navigation

import androidx.compose.runtime.Composable
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

@Composable
fun AuthNavHost(onAuthenticated: () -> Unit = {}) {
    val navController = rememberNavController()
    val viewModel: AuthViewModel = hiltViewModel()

    NavHost(navController = navController, startDestination = "login") {
        composable("login") {
            LoginScreen(
                viewModel = viewModel,
                onNavigateToRegister = { navController.navigate("register") },
                onNavigateToForgot = { navController.navigate("forgot") },
                onLoginSuccess = onAuthenticated
            )
        }
        composable("register") {
            RegisterScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onLoginSuccess = onAuthenticated
            )
        }
        composable("forgot") {
            ForgotPasswordScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
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
                onNavigateToLogin = { navController.navigate("login") }
            )
        }
    }
}
