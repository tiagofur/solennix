package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.R
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * A banner that displays error states with an action button.
 * Used for network errors, load failures, and other recoverable error states.
 *
 * @param title The error title (e.g., "No hay conexión")
 * @param message Detailed error message
 * @param actionButtonText Text for the action button
 * @param onActionClick Callback when the action button is clicked
 * @param modifier Modifier for the banner
 * @param visible Whether to show the banner
 */
@Composable
fun InlineErrorBanner(
    title: String,
    message: String,
    actionButtonText: String,
    onActionClick: () -> Unit,
    modifier: Modifier = Modifier,
    visible: Boolean = true
) {
    if (!visible) return

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = SolennixTheme.colors.error.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, SolennixTheme.colors.error.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.WifiOff,
                contentDescription = stringResource(R.string.cd_error_banner),
                tint = SolennixTheme.colors.error,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.error,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.padding(top = 2.dp))
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.primaryText
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Button(
                onClick = onActionClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = SolennixTheme.colors.error
                ),
                modifier = Modifier.padding(start = 8.dp)
            ) {
                Text(
                    text = actionButtonText,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

/**
 * A simplified error banner for use within cards or smaller spaces.
 * Does not include a border and has a more compact layout.
 */
@Composable
fun CompactErrorBanner(
    message: String,
    onActionClick: () -> Unit,
    actionButtonText: String = stringResource(R.string.common_retry),
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(SolennixTheme.colors.error.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.WifiOff,
            contentDescription = stringResource(R.string.cd_error_banner),
            tint = SolennixTheme.colors.error,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodySmall,
            color = SolennixTheme.colors.error,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Button(
            onClick = onActionClick,
            colors = ButtonDefaults.buttonColors(
                containerColor = SolennixTheme.colors.error
            ),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Text(
                text = actionButtonText,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium
            )
        }
    }
}
