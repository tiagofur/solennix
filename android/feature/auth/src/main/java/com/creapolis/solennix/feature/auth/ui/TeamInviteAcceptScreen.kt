package com.creapolis.solennix.feature.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.auth.R
import com.creapolis.solennix.feature.auth.viewmodel.AuthViewModel

@Composable
fun TeamInviteAcceptScreen(
    token: String?,
    viewModel: AuthViewModel,
    onNavigateToLogin: () -> Unit,
    onAccepted: () -> Unit,
    isWideScreen: Boolean = false
) {
    LaunchedEffect(viewModel.teamInviteSuccess) {
        if (viewModel.teamInviteSuccess) {
            onAccepted()
        }
    }

    AdaptiveAuthLayout(isWideScreen = isWideScreen) {
        TeamInviteAcceptFormContent(
            token = token,
            viewModel = viewModel,
            onNavigateToLogin = onNavigateToLogin,
            isWideScreen = isWideScreen
        )
    }
}

@Composable
private fun TeamInviteAcceptFormContent(
    token: String?,
    viewModel: AuthViewModel,
    onNavigateToLogin: () -> Unit,
    isWideScreen: Boolean
) {
    val hasToken = !token.isNullOrBlank()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = if (isWideScreen) 40.dp else 24.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (viewModel.teamInviteSuccess) {
            androidx.compose.material3.Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                modifier = Modifier.height(80.dp),
                tint = SolennixTheme.colors.success
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = stringResource(R.string.auth_team_invite_success_title),
                style = MaterialTheme.typography.headlineSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.auth_team_invite_success_message),
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center,
            )
            return
        }

        Text(
            text = stringResource(R.string.auth_team_invite_title),
            style = MaterialTheme.typography.headlineMedium,
            color = SolennixTheme.colors.primaryText,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (hasToken) {
                stringResource(R.string.auth_team_invite_subtitle)
            } else {
                stringResource(R.string.auth_team_invite_invalid_link)
            },
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(32.dp))

        if (!hasToken) {
            PremiumButton(
                text = stringResource(R.string.auth_team_invite_back_to_login),
                onClick = onNavigateToLogin,
            )
            return
        }

        SolennixTextField(
            value = viewModel.teamInvitePassword,
            onValueChange = { viewModel.teamInvitePassword = it },
            label = stringResource(R.string.auth_team_invite_password_label),
            leadingIcon = Icons.Default.Lock,
            isPassword = true,
        )

        Spacer(modifier = Modifier.height(16.dp))

        SolennixTextField(
            value = viewModel.teamInviteConfirmPassword,
            onValueChange = { viewModel.teamInviteConfirmPassword = it },
            label = stringResource(R.string.auth_team_invite_confirm_password_label),
            leadingIcon = Icons.Default.Lock,
            isPassword = true,
            imeAction = ImeAction.Done,
        )

        Spacer(modifier = Modifier.height(32.dp))

        PremiumButton(
            text = stringResource(R.string.auth_team_invite_submit),
            onClick = { viewModel.acceptTeamInvite(token) },
            isLoading = viewModel.isLoading,
            enabled = viewModel.teamInvitePassword.length >= 8
                && viewModel.teamInvitePassword.any { it.isUpperCase() }
                && viewModel.teamInvitePassword.any { it.isLowerCase() }
                && viewModel.teamInvitePassword.any { it.isDigit() }
                && viewModel.teamInvitePassword == viewModel.teamInviteConfirmPassword,
        )

        if (viewModel.errorMessage != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = viewModel.errorMessage.orEmpty(),
                color = SolennixTheme.colors.error,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
            )
        }
    }
}
