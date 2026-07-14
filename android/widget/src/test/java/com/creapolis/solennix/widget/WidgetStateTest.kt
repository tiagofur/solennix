package com.creapolis.solennix.widget

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * Tests for [determineWidgetState] — the pure function that decides whether a
 * widget should show a non-data state (signed-out / empty / error) or its
 * normal content (null).
 *
 * Evaluation precedence mirrors iOS WidgetStateView: signedOut → error → empty → data.
 */
class WidgetStateTest {

    @Test
    fun `null userId returns signed-out state`() {
        assertEquals(
            WidgetState.SIGNED_OUT,
            determineWidgetState(userId = null, hasData = true)
        )
    }

    @Test
    fun `null userId returns signed-out even when decode failed`() {
        // Auth gate takes precedence over error — a signed-out user never sees data errors.
        assertEquals(
            WidgetState.SIGNED_OUT,
            determineWidgetState(userId = null, hasData = false, decodeFailed = true)
        )
    }

    @Test
    fun `null userId returns signed-out even when has data`() {
        // Even if data exists in cache, a signed-out user must see the auth prompt (#825, #843).
        assertEquals(
            WidgetState.SIGNED_OUT,
            determineWidgetState(userId = null, hasData = true)
        )
    }

    @Test
    fun `authenticated user with decode failure returns error state`() {
        assertEquals(
            WidgetState.ERROR,
            determineWidgetState(userId = "u1", hasData = true, decodeFailed = true)
        )
    }

    @Test
    fun `authenticated user with no data returns empty state`() {
        assertEquals(
            WidgetState.EMPTY,
            determineWidgetState(userId = "u1", hasData = false)
        )
    }

    @Test
    fun `authenticated user with data returns null (render normal content)`() {
        assertNull(
            determineWidgetState(userId = "u1", hasData = true)
        )
    }

    @Test
    fun `error takes precedence over empty`() {
        // decodeFailed should show error, not empty, even when hasData is false.
        assertEquals(
            WidgetState.ERROR,
            determineWidgetState(userId = "u1", hasData = false, decodeFailed = true)
        )
    }
}
