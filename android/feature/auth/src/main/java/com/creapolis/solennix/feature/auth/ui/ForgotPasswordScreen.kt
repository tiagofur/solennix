package com.creapolis.solennix.feature.auth.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordScreen(
    viewModel: AuthViewModel,
    onNavigateBack: () -> Unit,
    isWideScreen: Boolean = false
) {
    AdaptiveAuthLayout(isWideScreen = isWideScreen) {
        ForgotPasswordFormContent(
            viewModel = viewModel,
            onNavigateBack = onNavigateBack,
            isWideScreen = isWideScreen
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ForgotPasswordFormContent(
    viewModel: AuthViewModel,
    onNavigateBack: () -> Unit,
    isWideScreen: Boolean
) {
    Scaffold(
        topBar = {
            if (!isWideScreen) {
                SolennixTopAppBar(
                    title = { Text("Recuperar Contrasena") },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = SolennixTheme.colors.background
                    )
                )
            }
        },
        containerColor = SolennixTheme.colors.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = if (isWideScreen) 40.dp else 24.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (isWideScreen) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Recuperar Contraseña",
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                        color = SolennixTheme.colors.primaryText
                    )
                }
                Spacer(modifier = Modifier.height(24.dp))
            }

            if (viewModel.forgotSuccess) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(80.dp),
                    tint = SolennixTheme.colors.success
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "Revisa tu correo",
                    style = MaterialTheme.typography.headlineSmall,
                    color = SolennixTheme.colors.primaryText,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Hemos enviado un enlace para restablecer tu contrasena a ${viewModel.forgotEmail}.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(48.dp))
                PremiumButton(
                    text = "Volver al Inicio",
                    onClick = onNavigateBack
                )
            } else {
                Text(
                    text = "Ingresa tu correo y te enviaremos un enlace para recuperar el acceso a tu cuenta.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(32.dp))

                SolennixTextField(
                    value = viewModel.forgotEmail,
                    onValueChange = { viewModel.forgotEmail = it },
                    label = "Correo Electronico",
                    placeholder = "ejemplo@correo.com",
                    leadingIcon = Icons.Default.Email,
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Done
                )

                Spacer(modifier = Modifier.height(32.dp))

                PremiumButton(
                    text = "Enviar Enlace",
                    onClick = { viewModel.forgotPassword() },
                    isLoading = viewModel.isLoading,
                    enabled = viewModel.forgotEmail.isNotBlank()
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
}
