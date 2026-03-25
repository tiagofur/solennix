package com.creapolis.solennix.feature.auth.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel

import androidx.compose.ui.graphics.vector.ImageVector

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    viewModel: AuthViewModel,
    onNavigateBack: () -> Unit,
    onLoginSuccess: () -> Unit = {}
) {
    LaunchedEffect(Unit) {
        viewModel.loginSuccess.collect { onLoginSuccess() }
    }

    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Crear Cuenta", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SolennixTheme.colors.background
                )
            )
        },
        containerColor = SolennixTheme.colors.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Unete a Solennix y gestiona tus eventos como un profesional.",
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            SolennixTextField(
                value = viewModel.registerName,
                onValueChange = { viewModel.registerName = it },
                label = "Nombre Completo",
                placeholder = "Juan Perez",
                leadingIcon = Icons.Default.Person
            )

            Spacer(modifier = Modifier.height(16.dp))

            SolennixTextField(
                value = viewModel.registerEmail,
                onValueChange = { viewModel.registerEmail = it },
                label = "Correo Electronico",
                placeholder = "ejemplo@correo.com",
                leadingIcon = Icons.Default.Email,
                keyboardType = KeyboardType.Email
            )

            Spacer(modifier = Modifier.height(16.dp))

            SolennixTextField(
                value = viewModel.registerPassword,
                onValueChange = { viewModel.registerPassword = it },
                label = "Contrasena",
                leadingIcon = Icons.Default.Lock,
                isPassword = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            SolennixTextField(
                value = viewModel.registerConfirmPassword,
                onValueChange = { viewModel.registerConfirmPassword = it },
                label = "Confirmar Contrasena",
                leadingIcon = Icons.Default.Lock,
                isPassword = true,
                imeAction = ImeAction.Done
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Feature Pills Section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                FeaturePill(text = "Gratis", icon = Icons.Default.Star)
                FeaturePill(text = "Seguro", icon = Icons.Default.Shield)
                FeaturePill(text = "Escalable", icon = Icons.Default.TrendingUp)
            }

            Spacer(modifier = Modifier.height(40.dp))

            PremiumButton(
                text = "Crear Cuenta",
                onClick = { viewModel.register() },
                isLoading = viewModel.isLoading,
                enabled = viewModel.isRegisterValid
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

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Al registrarte, aceptas nuestros Terminos de Servicio y Politica de Privacidad.",
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.tertiaryText,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            HorizontalDivider()
            
            Spacer(modifier = Modifier.height(24.dp))
            
            GoogleSignInButton(
                onSuccess = { idToken, fullName ->
                    viewModel.loginWithGoogle(idToken, fullName)
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
        }
    }
}

@Composable
fun FeaturePill(text: String, icon: ImageVector) {
    Surface(
        color = SolennixTheme.colors.surfaceGrouped,
        shape = MaterialTheme.shapes.extraSmall
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = SolennixTheme.colors.primary
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.primaryText
            )
        }
    }
}
