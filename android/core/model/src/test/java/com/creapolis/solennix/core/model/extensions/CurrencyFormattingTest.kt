package com.creapolis.solennix.core.model.extensions

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CurrencyFormattingTest {

    @Test
    fun `asMXN formats as standard Mexican Peso`() {
        val amount = 1234.56
        val result = amount.asMXN().replace("\u00A0", " ").replace("\u202F", " ")
        assertTrue(result.contains("$") && result.contains("1,234.56"))
    }

    @Test
    fun `asMXNCompact formats with zero decimals`() {
        val amount = 1234.56
        val result = amount.asMXNCompact().replace("\u00A0", " ").replace("\u202F", " ")
        assertTrue(result.contains("$") && result.contains("1,235"))
    }

    @Test
    fun `asCurrency formats dynamic currency codes`() {
        val amount = 1234.56
        val result = amount.asCurrency("USD").replace("\u00A0", " ").replace("\u202F", " ")
        assertTrue(result.contains("1,234.56") && result.contains("USD"))
    }

    @Test
    fun `asCurrencyCompact formats dynamic currency codes with zero decimals`() {
        val amount = 1234.56
        val result = amount.asCurrencyCompact("COP").replace("\u00A0", " ").replace("\u202F", " ")
        assertTrue(result.contains("1,235") && result.contains("COP"))
    }

    @Test
    fun `asCurrency defaults to MXN when code is null`() {
        val amount = 1234.56
        val result = amount.asCurrency(null).replace("\u00A0", " ").replace("\u202F", " ")
        assertTrue(result.contains("$") && result.contains("1,234.56"))
    }
}
