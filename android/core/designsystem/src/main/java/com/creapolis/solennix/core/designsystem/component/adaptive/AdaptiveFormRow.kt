package com.creapolis.solennix.core.designsystem.component.adaptive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen

/**
 * Places two composable slots side-by-side on tablet (50/50 weight),
 * or stacked vertically on phone.
 *
 * Matches iOS AdaptiveFormRow from AdaptiveLayout.swift.
 */
@Composable
fun AdaptiveFormRow(
    modifier: Modifier = Modifier,
    spacing: Dp = 16.dp,
    left: @Composable () -> Unit,
    right: @Composable () -> Unit
) {
    val isWideScreen = LocalIsWideScreen.current
    if (isWideScreen) {
        Row(
            modifier = modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(spacing),
            verticalAlignment = Alignment.Top
        ) {
            Box(modifier = Modifier.weight(1f)) { left() }
            Box(modifier = Modifier.weight(1f)) { right() }
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
