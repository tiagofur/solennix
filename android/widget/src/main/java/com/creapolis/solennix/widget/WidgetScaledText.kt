package com.creapolis.solennix.widget

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp

/**
 * Dynamic Type support for Glance widgets (#855).
 *
 * Glance `Text` uses `sp` font sizes which Android scales automatically with the
 * system [fontScale]. Unlike the app UI (which uses Compose `LocalDensity`), widgets
 * must read the scale from the host context's configuration. Two problems arise at
 * the largest accessibility settings:
 *
 * 1. **Uncapped growth** — iOS caps revenue text via `min(scaled, 36)` (`@ScaledMetric`
 *    in `KPIWidget.swift`). Android has no built-in cap, so a 2.0x scale doubles every
 *    size and breaks the fixed-size widget grid.
 * 2. **Clipped KPI values** — long values like `$125.0k` get truncated at large sizes.
 *
 * [scaledFontSize] applies a ceiling so text scales up to a reasonable maximum and
 * then stops, mirroring iOS's `cappedRevenueFontSize`. Call sites pair it with
 * `maxLines` + `TextOverflow` on critical values (see `KpiWidget.KpiCard`).
 */
object WidgetScaledText {

    /**
     * Maximum multiplier applied to widget font sizes, matching the iOS cap behavior
     * (`cappedRevenueFontSize = min(scaled, 36)` ≈ 1.3× of the 28sp base).
     *
     * Above this multiplier text stops growing so the fixed widget bounds still hold.
     * Below it, text respects the user's preference exactly (PRODUCT.md Dynamic Type).
     */
    const val MAX_FONT_SCALE = 1.3f

    /**
     * Pure scaling function — testable without a Composable context.
     *
     * @param baseSp the design-time font size in sp (what renders at fontScale 1.0)
     * @param fontScale the current system font scale (e.g. 1.0, 1.3, 2.0)
     * @return the sp value to pass to [androidx.glance.text.TextStyle], capped at
     *         [MAX_FONT_SCALE] × [baseSp]
     */
    fun scaledFontSize(baseSp: Float, fontScale: Float): TextUnit =
        (baseSp * fontScale.coerceAtMost(MAX_FONT_SCALE)).sp
}

/**
 * Reads the current system font scale from the Glance composition and returns a
 * capped sp value for the given base size. Use inside `provideContent { }` blocks.
 *
 * Example:
 * ```
 * Text(
 *     text = value,
 *     style = TextStyle(fontSize = rememberScaledSp(18f))
 * )
 * ```
 */
@Composable
fun rememberScaledSp(baseSp: Float): TextUnit =
    WidgetScaledText.scaledFontSize(
        baseSp = baseSp,
        fontScale = LocalContext.current.resources.configuration.fontScale
    )
