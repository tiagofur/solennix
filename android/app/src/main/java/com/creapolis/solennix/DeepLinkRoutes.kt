package com.creapolis.solennix

import android.content.Intent
import android.net.Uri
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/**
 * Extracts the initial app route from a deep link intent.
 *
 * Supports:
 * solennix://client/{id}, solennix://event/{id}, solennix://product/{id}, solennix://inventory/{id}
 * solennix://new-event, solennix://calendar, solennix://quick-quote, solennix://settings, solennix://pricing
 */
fun parseAppDeepLinkRoute(intent: Intent?): String? {
    val uri = intent?.data ?: return null
    return parseAppDeepLinkRoute(
        scheme = uri.scheme,
        host = uri.host,
        pathSegments = uri.pathSegments.orEmpty(),
        queryParams = buildMap {
            uri.getQueryParameter("clientId")?.let { put("clientId", it) }
            uri.getQueryParameter("query")?.let { put("query", it) }
            uri.getQueryParameter("q")?.let { put("q", it) }
            uri.getQueryParameter("source")?.let { put("source", it) }
            uri.getQueryParameter("feature")?.let { put("feature", it) }
        }
    )
}

fun parseAppDeepLinkRoute(
    scheme: String?,
    host: String?,
    pathSegments: List<String>,
    queryParams: Map<String, String> = emptyMap()
): String? {
    if (scheme != "solennix") return null

    val pathId = pathSegments.firstOrNull()
    val pathAction = pathSegments.getOrNull(1)
    val queryClientId = queryParams["clientId"]
    val query = queryParams["query"] ?: queryParams["q"]

    return when (host) {
        "client" -> pathId?.let { "client_detail/$it" }
        "event" -> {
            if (pathId.isNullOrBlank()) {
                null
            } else {
                when (pathAction) {
                    null, "complete" -> "event_detail/$pathId"
                    "checklist" -> "event_checklist/$pathId"
                    "finances" -> "event_finances/$pathId"
                    "payments" -> "event_payments/$pathId"
                    "products" -> "event_products/$pathId"
                    "extras" -> "event_extras/$pathId"
                    "equipment" -> "event_equipment/$pathId"
                    "supplies" -> "event_supplies/$pathId"
                    "shopping" -> "event_shopping/$pathId"
                    "photos" -> "event_photos/$pathId"
                    "contract" -> "event_contract/$pathId"
                    else -> "event_detail/$pathId"
                }
            }
        }
        "product" -> pathId?.let { "product_detail/$it" }
        "inventory" -> if (pathId.isNullOrBlank()) "inventory" else "inventory_detail/$pathId"
        "events" -> "events"
        "home" -> "home"
        "new-event" -> "event_form?eventId="
        "calendar" -> "calendar"
        "settings" -> "settings"
        "pricing" -> "pricing"
        "search" -> if (query.isNullOrBlank()) {
            "search?query="
        } else {
            "search?query=${encodeQueryValue(query)}"
        }
        "quick-quote" -> {
            val clientId = queryClientId ?: pathId
            if (clientId.isNullOrBlank()) {
                "quick_quote?clientId="
            } else {
                "quick_quote?clientId=${encodeQueryValue(clientId)}"
            }
        }
        // #1123 / #1124 — public quote request inbox deep links
        "requests" -> if (pathId.isNullOrBlank()) "requests_inbox" else "request_detail/$pathId"
        else -> null
    }
}

fun parseAuthDeepLinkRoute(intent: Intent?): String? {
    val uri = intent?.data ?: return null
    return parseAuthDeepLinkRoute(
        scheme = uri.scheme,
        host = uri.host,
        queryParams = buildMap {
            uri.getQueryParameter("token")?.let { put("token", it) }
        }
    )
}

fun parseAuthDeepLinkRoute(
    scheme: String?,
    host: String?,
    queryParams: Map<String, String> = emptyMap()
): String? {
    if (scheme != "solennix") return null
    val token = queryParams["token"]

    return when (host) {
        "reset-password" -> {
            if (token.isNullOrBlank()) {
                "reset-password?token="
            } else {
                "reset-password?token=${encodeQueryValue(token)}"
            }
        }
        "team-invite" -> {
            if (token.isNullOrBlank()) {
                "team-invite?token="
            } else {
                "team-invite?token=${encodeQueryValue(token)}"
            }
        }
        else -> null
    }
}

private fun encodeQueryValue(value: String): String {
    return URLEncoder.encode(value, StandardCharsets.UTF_8.toString()).replace("+", "%20")
}
