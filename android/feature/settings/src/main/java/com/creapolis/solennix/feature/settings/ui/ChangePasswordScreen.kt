package com.creapolis.solennix.feature.settings.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.viewmodel.ChangePasswordViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangePasswordScreen(
    viewModel: ChangePasswordViewModel,
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cambiar Contraseña") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 600.dp) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            Text(
                text = "Seguridad",
                style = MaterialTheme.typography.labelLarge,
                color = SolennixTheme.colors.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium,
                color = SolennixTheme.colors.card,
                tonalElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    SolennixTextField(
                        value = viewModel.currentPassword,
                        onValueChange = { viewModel.currentPassword = it },
                        label = "Contraseña Actual *",
                        leadingIcon = Icons.Default.Lock,
                        isPassword = true,
                        errorMessage = viewModel.currentPasswordError
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    SolennixTextField(
                        value = viewModel.newPassword,
                        onValueChange = { viewModel.newPassword = it },
                        label = "Nueva Contraseña *",
                        leadingIcon = Icons.Default.Lock,
                        isPassword = true,
                        errorMessage = viewModel.newPasswordError
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    SolennixTextField(
                        value = viewModel.confirmPassword,
                        onValueChange = { viewModel.confirmPassword = it },
                        label = "Confirmar Contraseña *",
                        leadingIcon = Icons.Default.Lock,
                        isPassword = true,
                        imeAction = ImeAction.Done,
                        errorMessage = viewModel.confirmPasswordError
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "La contraseña debe tener al menos 8 caracteres.",
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(horizontal = 4.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            if (viewModel.errorMessage != null) {
                Text(
                    text = viewModel.errorMessage.orEmpty(),
                    color = SolennixTheme.colors.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }

            PremiumButton(
                text = "Cambiar Contraseña",
                onClick = { viewModel.changePassword() },
                isLoading = viewModel.isSaving,
                enabled = !viewModel.isSaving
            )
        }
        }
    }
}
