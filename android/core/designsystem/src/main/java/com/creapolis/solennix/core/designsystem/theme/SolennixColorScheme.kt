package com.creapolis.solennix.core.designsystem.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

data class SolennixColorScheme(
    val primary: Color,
    val primaryDark: Color,
    val primaryLight: Color,
    val secondary: Color,
    val background: Color,
    val surfaceGrouped: Color,
    val surface: Color,
    val surfaceAlt: Color,
    val card: Color,
    val primaryText: Color,
    val secondaryText: Color,
    val tertiaryText: Color,
    val inverseText: Color,
    val border: Color,
    val borderLight: Color,
    val divider: Color,
    val success: Color,
    val warning: Color,
    val error: Color,
    val info: Color,
    val statusQuoted: Color,
    val statusConfirmed: Color,
    val statusCompleted: Color,
    val statusCancelled: Color,
    val kpiBlue: Color,
    val kpiGreen: Color,
    val kpiOrange: Color,
    val kpiRed: Color,
    val tabBarBg: Color,
    val tabBarActive: Color,
    val tabBarInactive: Color,
    val avatarPalette: List<Color>
) {
    fun toMaterialColorScheme(isDarkTheme: Boolean): ColorScheme {
        return if (isDarkTheme) {
            darkColorScheme(
                primary = primary,
                onPrimary = Color.Black,
                secondary = secondary,
                onSecondary = Color.Black,
                error = error,
                onError = Color.Black,
                background = background,
                onBackground = primaryText,
                surface = surface,
                onSurface = primaryText
            )
        } else {
            lightColorScheme(
                primary = primary,
                onPrimary = Color.White,
                secondary = secondary,
                onSecondary = Color.White,
                error = error,
                onError = Color.White,
                background = background,
                onBackground = primaryText,
                surface = surface,
                onSurface = primaryText
            )
        }
    }
}
