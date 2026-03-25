package com.creapolis.solennix.feature.auth.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.creapolis.solennix.core.designsystem.component.ButtonStyle
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.SolennixTitle
import com.creapolis.solennix.core.designsystem.theme.TaglineStyle
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgot: () -> Unit,
    onLoginSuccess: () -> Unit = {}
) {
    LaunchedEffect(Unit) {
        viewModel.loginSuccess.collect { onLoginSuccess() }
    }

    val scrollState = rememberScrollState()
    
    // Animation for logo
    val infiniteTransition = rememberInfiniteTransition(label = "logo")
    val logoScale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logoScale"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SolennixTheme.colors.background)
            .verticalScroll(scrollState)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(60.dp))

        // Logo Section
        Box(contentAlignment = Alignment.Center) {
            // Tulip cup icon placeholder or actual resource if available
            Text(
                text = "SOLENNIX",
                style = SolennixTitle,
                color = SolennixTheme.colors.primary,
                modifier = Modifier
                    .scale(logoScale)
                    .alpha(0.9f)
            )
        }
        
        Text(
            text = "CADA DETALLE IMPORTA",
            style = TaglineStyle,
            color = SolennixTheme.colors.secondaryText,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp)
        )

        Spacer(modifier = Modifier.height(64.dp))

        // Form Section
        SolennixTextField(
            value = viewModel.loginEmail,
            onValueChange = { viewModel.loginEmail = it },
            label = "Correo Electronico",
            placeholder = "ejemplo@correo.com",
            leadingIcon = Icons.Default.Email,
            keyboardType = KeyboardType.Email,
            errorMessage = if (viewModel.errorMessage?.contains("Email", ignoreCase = true) == true) viewModel.errorMessage else null
        )

        Spacer(modifier = Modifier.height(16.dp))

        SolennixTextField(
            value = viewModel.loginPassword,
            onValueChange = { viewModel.loginPassword = it },
            label = "Contrasena",
            leadingIcon = Icons.Default.Lock,
            isPassword = true,
            imeAction = ImeAction.Done,
            errorMessage = if (viewModel.errorMessage?.contains("Contrasena", ignoreCase = true) == true) viewModel.errorMessage else null
        )

        Spacer(modifier = Modifier.height(8.dp))

        TextButton(
            onClick = onNavigateToForgot,
            modifier = Modifier.align(Alignment.End)
        ) {
            Text(
                text = "Olvidaste tu contrasena?",
                color = SolennixTheme.colors.primary,
                style = MaterialTheme.typography.labelLarge
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        PremiumButton(
            text = "Iniciar Sesion",
            onClick = { viewModel.login() },
            isLoading = viewModel.isLoading,
            enabled = viewModel.isLoginValid
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

        Spacer(modifier = Modifier.height(32.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            HorizontalDivider(modifier = Modifier.weight(1f))
            Text(
                text = " o continua con ",
                modifier = Modifier.padding(horizontal = 8.dp),
                color = SolennixTheme.colors.secondaryText,
                style = MaterialTheme.typography.labelMedium
            )
            HorizontalDivider(modifier = Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(24.dp))

        GoogleSignInButton(
            onSuccess = { idToken, fullName ->
                viewModel.loginWithGoogle(idToken, fullName)
            },
            onError = { error ->
                viewModel.errorMessage = error
            }
        )

        Spacer(modifier = Modifier.height(12.dp))

        AppleSignInButton(
            onSuccess = { identityToken, fullName ->
                viewModel.loginWithApple(identityToken, fullName)
            },
            onError = { error ->
                viewModel.errorMessage = error
            }
        )

        Spacer(modifier = Modifier.height(32.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "No tienes cuenta? ",
                color = SolennixTheme.colors.secondaryText,
                style = MaterialTheme.typography.bodyMedium
            )
            TextButton(onClick = onNavigateToRegister) {
                Text(
                    text = "Crear Cuenta",
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}
