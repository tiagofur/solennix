package com.creapolis.solennix.core.designsystem.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class SolennixColorSchemeTest {

    @Test
    fun `light scheme maps material colors`() {
        val scheme = LightSolennixColors.toMaterialColorScheme(isDarkTheme = false)

        assertEquals(SolennixGold, scheme.primary)
        assertEquals(Color.White, scheme.onPrimary)
        assertEquals(SolennixSecondary, scheme.secondary)
        assertEquals(Color.White, scheme.onSecondary)
        assertEquals(LightSolennixColors.error, scheme.error)
        assertEquals(Color.White, scheme.onError)
        assertEquals(LightSolennixColors.background, scheme.background)
        assertEquals(LightSolennixColors.surface, scheme.surface)
        assertEquals(LightSolennixColors.primaryText, scheme.onBackground)
        assertEquals(LightSolennixColors.primaryText, scheme.onSurface)
    }

    @Test
    fun `dark scheme maps material colors`() {
        val scheme = DarkSolennixColors.toMaterialColorScheme(isDarkTheme = true)

        assertEquals(SolennixGold, scheme.primary)
        assertEquals(Color.Black, scheme.onPrimary)
        assertEquals(DarkSolennixColors.secondary, scheme.secondary)
        assertEquals(Color.Black, scheme.onSecondary)
        assertEquals(DarkSolennixColors.error, scheme.error)
        assertEquals(Color.Black, scheme.onError)
        assertEquals(DarkSolennixColors.background, scheme.background)
        assertEquals(DarkSolennixColors.surface, scheme.surface)
        assertEquals(DarkSolennixColors.primaryText, scheme.onBackground)
        assertEquals(DarkSolennixColors.primaryText, scheme.onSurface)
    }

    @Test
    fun `avatar tokens use brand tonal colors`() {
        // Light: warm neutral bg + dark gold initials
        assertEquals(AvatarBackgroundLight, LightSolennixColors.avatarBackground)
        assertEquals(AvatarInitialsLight, LightSolennixColors.avatarInitials)
        // Dark: navy bg + gold initials
        assertEquals(AvatarBackgroundDark, DarkSolennixColors.avatarBackground)
        assertEquals(AvatarInitialsDark, DarkSolennixColors.avatarInitials)
    }

    @Test
    fun `tonal icon tokens adapt to light and dark`() {
        // Light mode tonal icon colors
        assertEquals(IconSlateLight, LightSolennixColors.iconSlate)
        assertEquals(IconTaupeLight, LightSolennixColors.iconTaupe)
        assertEquals(IconSageLight, LightSolennixColors.iconSage)
        assertEquals(IconSteelLight, LightSolennixColors.iconSteel)
        assertEquals(IconPlumLight, LightSolennixColors.iconPlum)
        // Dark mode tonal icon colors
        assertEquals(IconSlateDark, DarkSolennixColors.iconSlate)
        assertEquals(IconTaupeDark, DarkSolennixColors.iconTaupe)
        assertEquals(IconSageDark, DarkSolennixColors.iconSage)
        assertEquals(IconSteelDark, DarkSolennixColors.iconSteel)
        assertEquals(IconPlumDark, DarkSolennixColors.iconPlum)
    }
}
