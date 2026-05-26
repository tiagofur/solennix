package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.creapolis.solennix.core.designsystem.R
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val statusColor = getStatusColor(status)
    val statusLabel = getStatusLabel(status)
    val statusContentDescription = stringResource(R.string.status_badge_a11y, statusLabel)

    Surface(
        modifier = modifier.semantics {
            contentDescription = statusContentDescription
        },
        color = statusColor.copy(alpha = 0.18f),
        shape = RoundedCornerShape(6.dp)
    ) {
        Text(
            text = statusLabel,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            color = statusColor,
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )
        )
    }
}

@Composable
private fun getStatusColor(status: String): Color {
    return when (status.lowercase()) {
        "quoted" -> SolennixTheme.colors.statusQuoted
        "confirmed" -> SolennixTheme.colors.statusConfirmed
        "completed" -> SolennixTheme.colors.statusCompleted
        "cancelled" -> SolennixTheme.colors.statusCancelled
        else -> SolennixTheme.colors.secondaryText
    }
}

@Composable
private fun getStatusLabel(status: String): String {
    return when (status.lowercase()) {
        "quoted" -> stringResource(R.string.status_quoted)
        "confirmed" -> stringResource(R.string.status_confirmed)
        "completed" -> stringResource(R.string.status_completed)
        "cancelled" -> stringResource(R.string.status_cancelled)
        else -> status.replaceFirstChar { it.uppercase() }
    }
}
