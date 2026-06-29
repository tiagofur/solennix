package com.creapolis.solennix.core.designsystem.util

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Shadow utilities matching iOS design tokens.
 * These are predefined shadow styles for consistent elevation across the app.
 */

/**
 * Small shadow - subtle elevation for cards and lists.
 * Alpha: 8%, Offset: (0, 1), Radius: 3
 */
fun Modifier.shadowSm(): Modifier = this.shadow(
    elevation = 1.dp,
    spotColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.08f),
    ambientColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.08f)
)

/**
 * Medium shadow - standard elevation for raised cards.
 * Alpha: 12%, Offset: (0, 2), Radius: 6
 */
fun Modifier.shadowMd(): Modifier = this.shadow(
    elevation = 2.dp,
    spotColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.12f),
    ambientColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.12f)
)

/**
 * Large shadow - prominent elevation for modals and important cards.
 * Alpha: 16%, Offset: (0, 4), Radius: 12
 */
fun Modifier.shadowLg(): Modifier = this.shadow(
    elevation = 4.dp,
    spotColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.16f),
    ambientColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.16f)
)

/**
 * FAB shadow - distinctive elevation for floating action buttons.
 * Alpha: 20%, Offset: (0, 6), Radius: 16
 */
fun Modifier.shadowFab(): Modifier = this.shadow(
    elevation = 6.dp,
    spotColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.20f),
    ambientColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.20f)
)

/**
 * Custom shadow with configurable parameters.
 *
 * @param elevation Vertical offset in dp
 * @param alpha Opacity of the shadow (0.0 - 1.0)
 * @param radius Blur radius in dp
 */
fun Modifier.shadowCustom(
    elevation: Dp,
    alpha: Float = 0.12f,
    radius: Dp = elevation
): Modifier = this.shadow(
    elevation = elevation,
    spotColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = alpha),
    ambientColor = androidx.compose.ui.graphics.Color.Black.copy(alpha = alpha)
)
