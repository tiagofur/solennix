package com.creapolis.solennix.feature.auth.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel

@Composable
fun ResetPasswordScreen(
    token: String?,
    viewModel: AuthViewModel,
    onNavigateToLogin: () -> Unit,
    isWideScreen: Boolean = false
) {
    LaunchedEffect(token) {
        if (token != null) {
            viewModel.resetToken = token
        }
    }

    AdaptiveAuthLayout(isWideScreen = isWideScreen) {
        ResetPasswordFormContent(
            viewModel = viewModel,
            onNavigateToLogin = onNavigateToLogin,
            isWideScreen = isWideScreen
        )
    }
}

@Composable
private fun ResetPasswordFormContent(
    viewModel: AuthViewModel,
    onNavigateToLogin: () -> Unit,
    isWideScreen: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = if (isWideScreen) 40.dp else 24.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (viewModel.resetSuccess) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = SolennixTheme.colors.success
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Contraseña actualizada",
                style = MaterialTheme.typography.headlineSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Tu contraseña fue restablecida con éxito. Ya podés iniciar sesión.",
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(48.dp))
            PremiumButton(
                text = "Ir a Login",
                onClick = onNavigateToLogin
            )
        } else {
            Text(
                text = "Restablecer Contraseña",
                style = MaterialTheme.typography.headlineMedium,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Ingresá tu nueva contraseña a continuación.",
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(40.dp))

            // On wide screens, show passwords side by side
            if (isWideScreen) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        SolennixTextField(
                            value = viewModel.newPassword,
                            onValueChange = { viewModel.newPassword = it },
                            label = "Nueva Contraseña",
                            leadingIcon = Icons.Default.Lock,
                            isPassword = true
                        )
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        SolennixTextField(
                            value = viewModel.confirmNewPassword,
                            onValueChange = { viewModel.confirmNewPassword = it },
                            label = "Confirmar Nueva Contraseña",
                            leadingIcon = Icons.Default.Lock,
                            isPassword = true,
                            imeAction = ImeAction.Done
                        )
                    }
                }
            } else {
                SolennixTextField(
                    value = viewModel.newPassword,
                    onValueChange = { viewModel.newPassword = it },
                    label = "Nueva Contrasena",
                    leadingIcon = Icons.Default.Lock,
                    isPassword = true
                )

                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.confirmNewPassword,
                    onValueChange = { viewModel.confirmNewPassword = it },
                    label = "Confirmar Nueva Contrasena",
                    leadingIcon = Icons.Default.Lock,
                    isPassword = true,
                    imeAction = ImeAction.Done
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            PremiumButton(
                text = "Restablecer",
                onClick = { viewModel.resetPassword() },
                isLoading = viewModel.isLoading,
                enabled = viewModel.newPassword.length >= 8
                    && viewModel.newPassword.any { it.isUpperCase() }
                    && viewModel.newPassword.any { it.isLowerCase() }
                    && viewModel.newPassword.any { it.isDigit() }
                    && viewModel.newPassword == viewModel.confirmNewPassword
            )

            if (viewModel.errorMessage != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = viewModel.errorMessage.orEmpty(),
                    color = SolennixTheme.colors.error,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
