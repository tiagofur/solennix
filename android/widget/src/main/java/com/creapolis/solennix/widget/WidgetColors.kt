package com.creapolis.solennix.widget

import androidx.annotation.ColorRes
import androidx.glance.unit.ColorProvider

/**
 * Centralized widget color accessors backed by Android color resources.
 *
 * Each color is defined in `res/values/colors.xml` (light) and overridden in
 * `res/values-night/colors.xml` (dark). The OS auto-resolves the correct value
 * based on the system theme — no manual `isSystemInDarkTheme()` checks needed.
 *
 * This approach is recommended by the Glance team over inline `Color(light, dark)`
 * pairs because the launcher rebinds resource-backed colors when the user toggles
 * dark mode, even without a full widget recomposition.
 *
 * Palette mirrors `LightSolennixColors` / `DarkSolennixColors` from `:core:designsystem`.
 * The widget module intentionally does not depend on `:core:designsystem` (widgets
 * cannot use Hilt DI and must stay lightweight), so values are duplicated here
 * in resource form rather than referenced as Compose `Color` objects.
 */
object WidgetColors {

    /** Widget surface background (cream in light, navy-surface in dark). */
    val background: ColorProvider = color(R.color.widget_background)

    /** Card/row background (white in light, dark-card in dark). */
    val card: ColorProvider = color(R.color.widget_card)

    /** Brand gold accent — same #C4A265 in both modes. */
    val primary: ColorProvider = color(R.color.widget_primary)

    /** Primary text color (near-black in light, warm-white in dark). */
    val textPrimary: ColorProvider = color(R.color.widget_text_primary)

    /** Secondary/muted text color. */
    val textSecondary: ColorProvider = color(R.color.widget_text_secondary)

    /** Semantic success green. */
    val success: ColorProvider = color(R.color.widget_success)

    /** Semantic warning orange. */
    val warning: ColorProvider = color(R.color.widget_warning)

    /** Quick-action button background (gold-light in light, navy in dark). */
    val buttonBg: ColorProvider = color(R.color.widget_button_bg)

    /** Date chip background (surface-alt in both modes). */
    val dateChipBg: ColorProvider = color(R.color.widget_date_chip_bg)
}

private fun color(@ColorRes resId: Int): ColorProvider = ColorProvider(resId)
