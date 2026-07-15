package com.creapolis.solennix.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.background
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.unit.dp

/**
 * Widget auth/empty/error states, mirroring iOS `WidgetStateView`.
 *
 * Evaluation precedence (matches iOS): signedOut → error → empty → data.
 * Each widget calls [determineWidgetState] to pick the state, then renders
 * [WidgetStateView] for non-null results, or its own content for null (data).
 */
enum class WidgetState {
    SIGNED_OUT,
    EMPTY,
    ERROR
}

/**
 * Pure function that determines which non-data state (if any) a widget should show.
 *
 * Returns `null` when the widget should render its normal content (authenticated + has data).
 *
 * @param userId the resolved user ID, or null if signed out / prefs unreadable
 * @param hasData whether the widget has at least one meaningful data row to display
 * @param decodeFailed whether a payload existed but could not be decoded (error state)
 */
fun determineWidgetState(
    userId: String?,
    hasData: Boolean,
    decodeFailed: Boolean = false
): WidgetState? = when {
    userId == null -> WidgetState.SIGNED_OUT
    decodeFailed -> WidgetState.ERROR
    !hasData -> WidgetState.EMPTY
    else -> null
}

/**
 * Renders a centered state message (icon symbol + localized title).
 *
 * Tapping the widget launches the host app — there is no inline sign-in button,
 * matching iOS behavior where the state is informational, not interactive.
 */
@Composable
fun WidgetStateView(
    context: Context,
    state: WidgetState,
    modifier: GlanceModifier = GlanceModifier
) {
    val symbol: String
    val titleRes: Int
    val accent: ColorProvider
    when (state) {
        WidgetState.SIGNED_OUT -> {
            symbol = "🔒"; titleRes = R.string.widget_state_signed_out; accent = WidgetColors.warning
        }
        WidgetState.EMPTY -> {
            symbol = "📭"; titleRes = R.string.widget_state_empty; accent = WidgetColors.textSecondary
        }
        WidgetState.ERROR -> {
            symbol = "⚠"; titleRes = R.string.widget_state_error; accent = WidgetColors.warning
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(WidgetColors.background)
            .padding(12.dp)
            .clickable(actionStartActivity(getLaunchIntent(context))),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = symbol,
                style = TextStyle(
                    fontSize = rememberScaledSp(28f),
                    color = accent
                )
            )
            Text(
                text = context.getString(titleRes),
                style = TextStyle(
                    fontWeight = FontWeight.Medium,
                    fontSize = rememberScaledSp(12f),
                    color = WidgetColors.textSecondary
                )
            )
        }
    }
}

internal fun getLaunchIntent(context: Context): Intent {
    return context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent()
}
