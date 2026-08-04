package com.creapolis.solennix

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class DeepLinkRoutesTest {

    @Test
    fun `parse app deep link maps event actions`() {
        assertEquals(
            "event_detail/e1",
            parseAppDeepLinkRoute("solennix", "event", listOf("e1"))
        )
        assertEquals(
            "event_checklist/e1",
            parseAppDeepLinkRoute("solennix", "event", listOf("e1", "checklist"))
        )
        assertEquals(
            "event_contract/e1",
            parseAppDeepLinkRoute("solennix", "event", listOf("e1", "contract"))
        )
        assertEquals(
            "quick_quote?clientId=c%201",
            parseAppDeepLinkRoute(
                scheme = "solennix",
                host = "quick-quote",
                pathSegments = emptyList(),
                queryParams = mapOf("clientId" to "c 1")
            )
        )
    }

    @Test
    fun `parse requests deep link maps inbox and detail`() {
        assertEquals(
            "requests_inbox",
            parseAppDeepLinkRoute("solennix", "requests", emptyList())
        )
        assertEquals(
            "request_detail/req-1",
            parseAppDeepLinkRoute("solennix", "requests", listOf("req-1"))
        )
    }

    @Test
    fun `parse auth deep link encodes token`() {
        assertEquals(
            "reset-password?token=t%201",
            parseAuthDeepLinkRoute(
                scheme = "solennix",
                host = "reset-password",
                queryParams = mapOf("token" to "t 1")
            )
        )
        assertNull(parseAuthDeepLinkRoute("http", "reset-password", mapOf("token" to "t")))
    }
}
