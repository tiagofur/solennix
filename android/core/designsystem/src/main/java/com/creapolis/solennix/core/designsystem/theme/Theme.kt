package com.creapolis.solennix.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

val LocalSolennixColors = staticCompositionLocalOf { LightSolennixColors }
val LocalDarkTheme = staticCompositionLocalOf { false }

@Composable
fun SolennixTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkSolennixColors else LightSolennixColors

    CompositionLocalProvider(
        LocalSolennixColors provides colors,
        LocalDarkTheme provides darkTheme
    ) {
        MaterialTheme(
            colorScheme = colors.toMaterialColorScheme(),
            typography = SolennixTypography,
            shapes = SolennixShapes,
            content = content
        )
    }
}

object SolennixTheme {
    val colors: SolennixColorScheme
        @Composable
        @ReadOnlyComposable
        get() = LocalSolennixColors.current
}
