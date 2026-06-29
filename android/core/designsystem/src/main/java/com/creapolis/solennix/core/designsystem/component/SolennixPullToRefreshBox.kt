package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshState
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * Brand-customized PullToRefreshBox that overrides indicator colors to use the
 * Solennix primary gold brand color instead of Material 3 default fallbacks.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SolennixPullToRefreshBox(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    state: PullToRefreshState = rememberPullToRefreshState(),
    contentAlignment: Alignment = Alignment.TopCenter,
    content: @Composable BoxScope.() -> Unit
) {
    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier,
        state = state,
        colors = PullToRefreshDefaults.colors(
            containerColor = SolennixTheme.colors.card,
            color = SolennixTheme.colors.primary
        ),
        contentAlignment = contentAlignment,
        content = content
    )
}
