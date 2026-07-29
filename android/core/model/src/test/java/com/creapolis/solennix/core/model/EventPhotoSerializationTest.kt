package com.creapolis.solennix.core.model

import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Locks the wire contract for [EventPhoto] against the backend's emitted JSON.
 *
 * Regression guard: a previous build declared a required `eventId` mapped to
 * `event_id`, but the backend's `EventPhoto` schema never sends that key.
 * kotlinx.serialization threw `MissingFieldException` on every decode, which
 * made event photos uploaded from any client invisible on Android AND made
 * the Android upload flow throw on its own 201 response — so uploads appeared
 * to fail even though the backend persisted them. This must not come back.
 */
class EventPhotoSerializationTest {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    @Test
    fun decodesBackendListResponse_withoutEventId() {
        val payload =
            """[{"id":"11111111-1111-1111-1111-111111111111","url":"/api/uploads/u/a.jpg","created_at":"2026-01-01T00:00:00Z"}]"""

        val photos = json.decodeFromString<List<EventPhoto>>(payload)

        assertEquals(1, photos.size)
        assertEquals("/api/uploads/u/a.jpg", photos[0].url)
        assertEquals("11111111-1111-1111-1111-111111111111", photos[0].id)
        assertEquals("2026-01-01T00:00:00Z", photos[0].createdAt)
    }

    @Test
    fun decodesBackendSingleResponse_withoutEventId() {
        val payload =
            """{"id":"22222222-2222-2222-2222-222222222222","url":"https://cdn/b.png","thumbnail_url":"https://cdn/b_thumb.png","caption":"nice","created_at":"2026-02-02T03:04:05Z"}"""

        val photo = json.decodeFromString<EventPhoto>(payload)

        assertEquals("22222222-2222-2222-2222-222222222222", photo.id)
        assertEquals("https://cdn/b_thumb.png", photo.thumbnailUrl)
        assertEquals("nice", photo.caption)
    }
}
