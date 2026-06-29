package com.creapolis.solennix.core.designsystem.util

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.ui.platform.LocalConfiguration

/**
 * Calculates whether sheet should skip partially expanded state based on window size.
 * On compact screens (phones), allows partial expansion (returns false).
 * On larger screens (tablets), expands fully by default (returns true).
 */
@Composable
fun shouldSkipPartiallyExpanded(): Boolean {
    val configuration = LocalConfiguration.current
    // Use screen width as a proxy for window size class
    // Compact: < 600dp, Medium: 600-840dp, Expanded: > 840dp
    return configuration.screenWidthDp >= 600
}

/**
 * Returns adaptive horizontal padding for sheet content.
 * Uses smaller padding on phones, larger on tablets.
 */
@Composable
fun adaptiveSheetPadding(): Dp {
    val configuration = LocalConfiguration.current
    return when {
        configuration.screenWidthDp < 600 -> 16.dp  // Phone
        else -> 24.dp  // Tablet
    }
}

/**
 * Returns true if the current window width is compact (phone-sized).
 */
@Composable
fun isCompactWidth(): Boolean {
    val configuration = LocalConfiguration.current
    return configuration.screenWidthDp < 600
}
