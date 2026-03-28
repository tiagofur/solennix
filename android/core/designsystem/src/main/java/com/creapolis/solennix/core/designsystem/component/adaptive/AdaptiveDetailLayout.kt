package com.creapolis.solennix.core.designsystem.component.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen

/**
 * Two-column 50/50 layout on tablet for detail screens,
 * stacked vertically on phone.
 *
 * Matches iOS AdaptiveDetailLayout from AdaptiveLayout.swift.
 */
@Composable
fun AdaptiveDetailLayout(
    modifier: Modifier = Modifier,
    spacing: Dp = 16.dp,
    left: @Composable ColumnScope.() -> Unit,
    right: @Composable ColumnScope.() -> Unit
) {
    val isWideScreen = LocalIsWideScreen.current
    if (isWideScreen) {
        Row(
            modifier = modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(spacing)
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(spacing)
            ) { left() }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(spacing)
            ) { right() }
        }
    } else {
        Column(
            modifier = modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(spacing)
        ) {
            left()
            right()
        }
    }
}
