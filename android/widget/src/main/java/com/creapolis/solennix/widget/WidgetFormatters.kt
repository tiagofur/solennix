package com.creapolis.solennix.widget

import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

data class FormattedDate(
    val day: String,
    val month: String
)

object WidgetFormatters {

    private val esMxLocale: Locale = Locale.forLanguageTag("es-MX")

    fun formatEventDate(dateString: String): FormattedDate {
        return try {
            val date = LocalDate.parse(dateString.take(10))
            val dayFormatter = DateTimeFormatter.ofPattern("d")
            val monthFormatter = DateTimeFormatter.ofPattern("MMM", esMxLocale)
            FormattedDate(
                day = date.format(dayFormatter),
                // CLDR data may include trailing punctuation in abbreviated months (e.g. "mar.").
                month = date.format(monthFormatter).replace(".", "").uppercase(esMxLocale)
            )
        } catch (_: Exception) {
            FormattedDate("--", "---")
        }
    }

    fun formatCurrency(amount: Double): String {
        return if (amount >= 1000) {
            val thousands = amount / 1000
            String.format(esMxLocale, "$%.1fk", thousands)
        } else {
            NumberFormat.getCurrencyInstance(esMxLocale)
                .format(amount)
                .replace(".00", "")
        }
    }

    fun formatTodayDate(today: LocalDate = LocalDate.now()): String {
        val formatter = DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", esMxLocale)
        return today.format(formatter).replaceFirstChar { it.uppercase() }
    }

    fun formatTime(dateString: String): String {
        return try {
            if (dateString.contains("T") && dateString.length >= 16) {
                dateString.substring(11, 16)
            } else {
                ""
            }
        } catch (_: Exception) {
            ""
        }
    }
}
