package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarData
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * Visual variants for [SolennixSnackbar]. Each maps to a semantic status color token
 * and a representative glyph.
 */
enum class SnackbarVariant {
    SUCCESS,
    ERROR,
    WARNING,
    INFO
}

@Composable
private fun SnackbarVariant.color() = when (this) {
    SnackbarVariant.SUCCESS -> SolennixTheme.colors.success
    SnackbarVariant.ERROR -> SolennixTheme.colors.error
    SnackbarVariant.WARNING -> SolennixTheme.colors.warning
    SnackbarVariant.INFO -> SolennixTheme.colors.info
}

private fun SnackbarVariant.icon(): ImageVector = when (this) {
    SnackbarVariant.SUCCESS -> Icons.Filled.CheckCircle
    SnackbarVariant.ERROR -> Icons.Filled.ErrorOutline
    SnackbarVariant.WARNING -> Icons.Filled.Warning
    SnackbarVariant.INFO -> Icons.Filled.Info
}

/**
 * A styled Material 3 snackbar: leading semantic glyph on a color-tinted circular chip,
 * message, optional action and an explicit dismiss button. Rendered from a
 * [SnackbarData] produced by [androidx.compose.material3.SnackbarHostState.showSnackbar].
 *
 * Pass a non-null [variant] (resolved from the originating
 * `com.creapolis.solennix.core.designsystem.event.UiEvent` by
 * [com.creapolis.solennix.core.designsystem.event.UiEventSnackbarHandler]) so the icon
 * and accent match the event semantics. Defaults to [SnackbarVariant.INFO].
 */
@Composable
fun SolennixSnackbar(
    snackbarData: SnackbarData,
    modifier: Modifier = Modifier,
    variant: SnackbarVariant = SnackbarVariant.INFO,
) {
    val accent = variant.color()
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        color = SolennixTheme.colors.card,
        shadowElevation = 6.dp,
        tonalElevation = 0.dp,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                imageVector = variant.icon(),
                contentDescription = null,
                tint = SolennixTheme.colors.card,
                modifier = Modifier
                    .size(28.dp)
                    .background(accent, CircleShape)
                    .padding(6.dp),
            )
            Text(
                text = snackbarData.visuals.message,
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.primaryText,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            snackbarData.visuals.actionLabel?.let { label ->
                TextButton(
                    onClick = { snackbarData.performAction() },
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp),
                ) {
                    Text(
                        text = label,
                        color = accent,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            if (snackbarData.visuals.withDismissAction) {
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(
                    onClick = { snackbarData.dismiss() },
                    modifier = Modifier.size(28.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = null,
                        tint = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}
