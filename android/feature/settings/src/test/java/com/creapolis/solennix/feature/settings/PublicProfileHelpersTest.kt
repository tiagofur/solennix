package com.creapolis.solennix.feature.settings

import com.creapolis.solennix.core.model.PublicOrganizerProfile
import com.creapolis.solennix.core.model.SolennixUrls
import com.creapolis.solennix.feature.settings.viewmodel.PublicProfileSettingsViewModel
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PublicProfileHelpersTest {

    @Test
    fun `share URL uses web base not API host`() {
        val url = SolennixUrls.publicProfileUrl("mi-negocio")
        assertEquals("https://solennix.com/u/mi-negocio", url)
        assertFalse(url.contains("api."))
        assertEquals("https://solennix.com", SolennixUrls.WEB_BASE_URL)
    }

    @Test
    fun `public organizer display name respects showBusinessName`() {
        val withBusiness = PublicOrganizerProfile(
            slug = "mi-negocio",
            businessName = "Mi Negocio",
            showBusinessName = true,
            headline = "Headline"
        )
        assertEquals("Mi Negocio", withBusiness.displayName)

        val headlineOnly = PublicOrganizerProfile(
            slug = "mi-negocio",
            businessName = "Mi Negocio",
            showBusinessName = false,
            headline = "Headline"
        )
        assertEquals("Headline", headlineOnly.displayName)

        assertEquals(
            "https://solennix.com/u/mi-negocio",
            withBusiness.publicUrl
        )
    }

    @Test
    fun `slug regex accepts valid kebab case`() {
        assertTrue(PublicProfileSettingsViewModel.SLUG_REGEX.matches("mi-negocio"))
        assertTrue(PublicProfileSettingsViewModel.SLUG_REGEX.matches("abc"))
        assertTrue(PublicProfileSettingsViewModel.SLUG_REGEX.matches("a1-b2-c3"))
    }

    @Test
    fun `slug regex rejects invalid formats`() {
        assertFalse(PublicProfileSettingsViewModel.SLUG_REGEX.matches("Mi-Negocio"))
        assertFalse(PublicProfileSettingsViewModel.SLUG_REGEX.matches("-leading"))
        assertFalse(PublicProfileSettingsViewModel.SLUG_REGEX.matches("trailing-"))
        assertFalse(PublicProfileSettingsViewModel.SLUG_REGEX.matches("has spaces"))
        assertFalse(PublicProfileSettingsViewModel.SLUG_REGEX.matches("under_score"))
        // Length is validated separately; regex only covers character shape.
        assertTrue(PublicProfileSettingsViewModel.SLUG_REGEX.matches("ab"))
    }

    @Test
    fun `parseSocials splits key value pairs`() {
        val result = PublicProfileSettingsViewModel.parseSocials(
            "instagram=@x, twitter=@y, site=https://ex.com"
        )
        assertEquals("@x", result["instagram"])
        assertEquals("@y", result["twitter"])
        assertEquals("https://ex.com", result["site"])
    }

    @Test
    fun `parseSocials empty returns empty map`() {
        assertTrue(PublicProfileSettingsViewModel.parseSocials("").isEmpty())
        assertTrue(PublicProfileSettingsViewModel.parseSocials("   ").isEmpty())
    }
}
