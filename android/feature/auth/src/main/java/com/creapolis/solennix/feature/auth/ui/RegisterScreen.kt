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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.feature.auth.R
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel

import androidx.compose.ui.graphics.vector.ImageVector

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    viewModel: AuthViewModel,
    onNavigateBack: () -> Unit,
    onLoginSuccess: () -> Unit = {},
    isWideScreen: Boolean = false
) {
    LaunchedEffect(Unit) {
        viewModel.loginSuccess.collect { onLoginSuccess() }
    }

    AdaptiveAuthLayout(isWideScreen = isWideScreen) {
        RegisterFormContent(
            viewModel = viewModel,
            onNavigateBack = onNavigateBack,
            isWideScreen = isWideScreen
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RegisterFormContent(
    viewModel: AuthViewModel,
    onNavigateBack: () -> Unit,
    isWideScreen: Boolean
) {
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            if (!isWideScreen) {
                SolennixTopAppBar(
                    title = { Text(stringResource(R.string.auth_register_title), style = MaterialTheme.typography.titleLarge) },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.auth_nav_back))
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
                .verticalScroll(scrollState)
                .padding(horizontal = if (isWideScreen) 40.dp else 24.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isWideScreen) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.auth_nav_back))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.auth_register_title),
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                        color = SolennixTheme.colors.primaryText
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            Text(
                text = stringResource(R.string.auth_register_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            SolennixTextField(
                value = viewModel.registerName,
                onValueChange = { viewModel.registerName = it },
                label = stringResource(R.string.auth_register_name_label),
                placeholder = stringResource(R.string.auth_register_name_placeholder),
                leadingIcon = Icons.Default.Person
            )

            Spacer(modifier = Modifier.height(16.dp))

            SolennixTextField(
                value = viewModel.registerEmail,
                onValueChange = { viewModel.registerEmail = it },
                label = stringResource(R.string.auth_register_email_label),
                placeholder = stringResource(R.string.auth_register_email_placeholder),
                leadingIcon = Icons.Default.Email,
                keyboardType = KeyboardType.Email
            )

            Spacer(modifier = Modifier.height(16.dp))

            SolennixTextField(
                value = viewModel.registerPassword,
                onValueChange = { viewModel.registerPassword = it },
                label = stringResource(R.string.auth_register_password_label),
                leadingIcon = Icons.Default.Lock,
                isPassword = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            SolennixTextField(
                value = viewModel.registerConfirmPassword,
                onValueChange = { viewModel.registerConfirmPassword = it },
                label = stringResource(R.string.auth_register_confirm_password_label),
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
                FeaturePill(text = stringResource(R.string.auth_register_feature_free), icon = Icons.Default.Star)
                FeaturePill(text = stringResource(R.string.auth_register_feature_secure), icon = Icons.Default.Shield)
                FeaturePill(text = stringResource(R.string.auth_register_feature_scalable), icon = Icons.Default.TrendingUp)
            }

            Spacer(modifier = Modifier.height(40.dp))

            PremiumButton(
                text = stringResource(R.string.auth_register_submit),
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
                text = stringResource(R.string.auth_register_terms_notice),
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
