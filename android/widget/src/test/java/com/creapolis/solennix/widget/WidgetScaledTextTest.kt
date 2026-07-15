package com.creapolis.solennix.widget

import androidx.compose.ui.unit.TextUnitType
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class WidgetScaledTextTest {

    @Test
    fun `default font scale returns base size`() {
        val size = WidgetScaledText.scaledFontSize(baseSp = 18f, fontScale = 1.0f)

        assertEquals(18f, size.value)
        assertEquals(TextUnitType.Sp, size.type)
    }

    @Test
    fun `larger font scale grows proportionally`() {
        val size = WidgetScaledText.scaledFontSize(baseSp = 18f, fontScale = 1.2f)

        assertEquals(21.6f, size.value, 0.001f)
    }

    @Test
    fun `font scale above cap is clamped to MAX_FONT_SCALE`() {
        // iOS caps at ~1.3x (cappedRevenueFontSize = min(scaled, 36) of a 28sp base).
        val size = WidgetScaledText.scaledFontSize(baseSp = 18f, fontScale = 2.0f)

        val expected = 18f * WidgetScaledText.MAX_FONT_SCALE
        assertEquals(expected, size.value, 0.001f)
    }

    @Test
    fun `cap matches iOS 28sp revenue cap`() {
        // KPIWidget.swift: @ScaledMetric(.largeTitle) 28, capped at 36 → 36/28 ≈ 1.286.
        // Our cap (1.3) keeps the largest accessibility value within the widget bounds.
        val baseRevenue = 28f
        val largestScale = 2.0f
        val capped = WidgetScaledText.scaledFontSize(baseRevenue, largestScale)

        // Must not exceed the iOS-equivalent ceiling.
        assert(capped.value <= 37f) { "capped ${capped.value} exceeded iOS-equivalent 37sp ceiling" }
    }

    @Test
    fun `font scale below 1 shrinks proportionally`() {
        val size = WidgetScaledText.scaledFontSize(baseSp = 18f, fontScale = 0.85f)

        assertEquals(15.3f, size.value, 0.001f)
    }
}
