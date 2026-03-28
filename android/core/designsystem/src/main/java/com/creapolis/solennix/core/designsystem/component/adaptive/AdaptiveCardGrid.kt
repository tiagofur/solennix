package com.creapolis.solennix.core.designsystem.component.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen

/**
 * Renders a multi-column grid on tablet (using LazyVerticalGrid with adaptive columns)
 * or a single-column LazyColumn on phone.
 *
 * Provides separate content lambdas for grid and list modes since
 * LazyGridScope and LazyListScope have different APIs.
 *
 * Matches iOS AdaptiveCardGrid from AdaptiveLayout.swift.
 */
@Composable
fun AdaptiveCardGrid(
    modifier: Modifier = Modifier,
    minItemWidth: Dp = 300.dp,
    contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
    spacing: Dp = 12.dp,
    gridContent: LazyGridScope.() -> Unit,
    listContent: LazyListScope.() -> Unit
) {
    val isWideScreen = LocalIsWideScreen.current
    if (isWideScreen) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = minItemWidth),
            modifier = modifier.fillMaxSize(),
            contentPadding = contentPadding,
            horizontalArrangement = Arrangement.spacedBy(spacing),
            verticalArrangement = Arrangement.spacedBy(spacing),
            content = gridContent
        )
    } else {
        LazyColumn(
            modifier = modifier.fillMaxSize(),
            content = listContent
        )
    }
}
