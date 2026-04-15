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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
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

    val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Desbloqueá Solennix")
        .setSubtitle("Usá tu huella o rostro para continuar")
        .setNegativeButtonText("Cerrar Sesión")
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
                text = "Acceso Protegido",
                style = if (isWideScreen) MaterialTheme.typography.headlineMedium
                else MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primaryText
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Confirmá tu identidad para continuar utilizando la aplicación.",
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(48.dp))
            PremiumButton(
                text = "Intentar de nuevo",
                onClick = { biometricPrompt.authenticate(promptInfo) }
            )
        }
    }
}
