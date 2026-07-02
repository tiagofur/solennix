package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * Semantic severity for [InfoAlertDialog]. Each value maps to a status color token
 * ([SolennixTheme.colors.warning] / [.info] / [.error]) and a representative glyph.
 */
enum class AlertSeverity {
    WARNING,
    INFO,
    ERROR
}

@Composable
private fun AlertSeverity.color() = when (this) {
    AlertSeverity.WARNING -> SolennixTheme.colors.warning
    AlertSeverity.INFO -> SolennixTheme.colors.info
    AlertSeverity.ERROR -> SolennixTheme.colors.error
}

private fun AlertSeverity.icon(): ImageVector = when (this) {
    AlertSeverity.WARNING -> Icons.Filled.Warning
    AlertSeverity.INFO -> Icons.Filled.Info
    AlertSeverity.ERROR -> Icons.Filled.ErrorOutline
}

/**
 * A single-button, semantic modal alert for non-destructive blocks (e.g. an action
 * cannot proceed because of a precondition). Mirrors the centered icon + title + body
 * pattern of [UpgradePlanDialog], but reusable across severity levels and without a
 * dismiss button — the single confirm button is the only way out.
 *
 * Use [ConfirmDialog] instead when a two-button (confirm / cancel) destructive
 * confirmation is needed.
 *
 * @param severity drives icon + accent color. Defaults to [AlertSeverity.WARNING].
 */
@Composable
fun InfoAlertDialog(
    title: String,
    message: String,
    confirmText: String,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier,
    severity: AlertSeverity = AlertSeverity.WARNING,
) {
    val accent = severity.color()
    AlertDialog(
        onDismissRequest = onConfirm,
        modifier = modifier,
        containerColor = SolennixTheme.colors.card,
        icon = {
            Icon(
                imageVector = severity.icon(),
                contentDescription = null,
                tint = accent,
                modifier = Modifier.size(48.dp)
            )
        },
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primaryText,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        },
        text = {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = accent)
            ) {
                Text(confirmText)
            }
        }
    )
}
