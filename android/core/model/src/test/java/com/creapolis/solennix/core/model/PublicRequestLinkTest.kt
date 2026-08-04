package com.creapolis.solennix.core.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class PublicRequestLinkTest {

    @Test
    fun `shareUrl uses server url when present`() {
        val link = PublicRequestLink(
            id = "1",
            token = "tok",
            url = "https://app.example/s/tok"
        )
        assertEquals("https://app.example/s/tok", link.shareUrl)
    }

    @Test
    fun `shareUrl falls back to token path when url blank`() {
        val link = PublicRequestLink(id = "1", token = "abc", url = null)
        assertEquals("https://solennix.com/s/abc", link.shareUrl)
    }

    @Test
    fun `default submit mode is auto_event`() {
        assertEquals("auto_event", PublicRequestLink().submitMode)
        assertEquals("auto_event", GeneratePublicRequestLinkRequest().submitMode)
    }
}
