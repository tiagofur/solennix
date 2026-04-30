package com.creapolis.solennix.feature.auth.ui

import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import com.creapolis.solennix.feature.auth.R
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.network.AuthManager
import java.util.concurrent.Executors
import java.util.concurrent.ExecutorService

@Composable
fun BiometricGateScreen(
    authManager: AuthManager,
    isWideScreen: Boolean = false
) {
    val context = LocalContext.current
    val executor = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose { executor.shutdown() }
    }

    val biometricPrompt = BiometricPrompt(
        context as? FragmentActivity ?: return,
        executor,
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                    authManager.failedBiometric()
                }
            }

            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                authManager.unlockWithBiometric()
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
            }
        }
    )

    val promptTitle = stringResource(R.string.auth_biometric_prompt_title)
    val promptSubtitle = stringResource(R.string.auth_biometric_prompt_subtitle)
    val promptCancel = stringResource(R.string.auth_biometric_prompt_cancel)

    val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle(promptTitle)
        .setSubtitle(promptSubtitle)
        .setNegativeButtonText(promptCancel)
        .build()

    LaunchedEffect(Unit) {
        biometricPrompt.authenticate(promptInfo)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SolennixTheme.colors.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .then(
                    if (isWideScreen) Modifier.widthIn(max = 500.dp) else Modifier.fillMaxWidth()
                )
                .padding(horizontal = if (isWideScreen) 40.dp else 24.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Fingerprint,
                contentDescription = null,
                modifier = Modifier.size(if (isWideScreen) 120.dp else 100.dp),
                tint = SolennixTheme.colors.primary
            )
            Spacer(modifier = Modifier.height(if (isWideScreen) 32.dp else 24.dp))
            Text(
                text = stringResource(R.string.auth_biometric_title),
                style = if (isWideScreen) MaterialTheme.typography.headlineMedium
                else MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primaryText
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.auth_biometric_description),
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(48.dp))
            PremiumButton(
                text = stringResource(R.string.auth_biometric_retry),
                onClick = { biometricPrompt.authenticate(promptInfo) }
            )
        }
    }
}
