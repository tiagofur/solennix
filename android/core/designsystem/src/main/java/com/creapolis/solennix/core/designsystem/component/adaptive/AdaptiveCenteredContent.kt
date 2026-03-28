package com.creapolis.solennix.core.designsystem.component.adaptive

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen

/**
 * Centers content with a max width constraint on tablet,
 * full width on phone. Prevents content from stretching
 * across large screens.
 *
 * Matches iOS AdaptiveCenteredContent from AdaptiveLayout.swift.
 */
@Composable
fun AdaptiveCenteredContent(
    modifier: Modifier = Modifier,
    maxWidth: Dp = 600.dp,
    content: @Composable () -> Unit
) {
    val isWideScreen = LocalIsWideScreen.current
    if (isWideScreen) {
        Box(
            modifier = modifier.fillMaxWidth(),
            contentAlignment = Alignment.TopCenter
        ) {
            Box(modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth()) {
                content()
            }
        }
    } else {
        Box(modifier = modifier.fillMaxWidth()) {
            content()
        }
    }
}
