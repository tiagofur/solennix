package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.R
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * A banner that indicates the displayed data is cached and may be stale.
 * Shows a cloud sync icon with warning text, typically shown at the top of screens.
 */
@Composable
fun CachedDataBanner(
    modifier: Modifier = Modifier,
    lastUpdateTime: String? = null
) {
    val message = if (lastUpdateTime != null) {
        stringResource(R.string.cached_data_with_time, lastUpdateTime)
    } else {
        stringResource(R.string.cached_data)
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(SolennixTheme.colors.warning.copy(alpha = 0.15f))
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.CloudSync,
            contentDescription = stringResource(R.string.cd_cached_data),
            tint = SolennixTheme.colors.warning,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodySmall,
            color = SolennixTheme.colors.primaryText,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * A compact inline version of the cached data banner for use within cards.
 */
@Composable
fun CachedDataIndicator(
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.CloudSync,
            contentDescription = stringResource(R.string.cd_cached_data),
            tint = SolennixTheme.colors.warning,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = stringResource(R.string.cached_data_short),
            style = MaterialTheme.typography.labelSmall,
            color = SolennixTheme.colors.warning,
            fontWeight = FontWeight.Medium
        )
    }
}
