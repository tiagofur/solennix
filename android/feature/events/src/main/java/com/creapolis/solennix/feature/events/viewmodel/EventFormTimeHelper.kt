package com.creapolis.solennix.feature.events.viewmodel

import java.time.LocalTime

object EventFormTimeHelper {
    /**
     * Accepts a blank string (maps to null in the backend) or a 24h time in HH:mm /
     * HH:mm:ss format. Uses [LocalTime.parse] which rejects out-of-range
     * values like "25:00" or "12:61".
     */
    fun isValidTime24h(s: String): Boolean {
        if (s.isBlank()) return true
        return try {
            LocalTime.parse(s)
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Normalizes "14:30" and "14:30:00" to the same canonical form for comparison. */
    fun normalizeTime(s: String): String? = try {
        LocalTime.parse(s).toString()
    } catch (e: Exception) {
        null
    }
}
