package com.creapolis.solennix.core.designsystem.component

import android.content.Context
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.RichTooltip
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TooltipBox
import androidx.compose.material3.TooltipDefaults
import androidx.compose.material3.rememberTooltipState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import com.creapolis.solennix.core.designsystem.R

private const val TOOLTIP_PREFS = "solennix_tooltips"

/**
 * Wraps [content] with an M3 RichTooltip shown once per [tooltipKey].
 *
 * The "shown" flag is persisted in SharedPreferences using the same
 * mechanism as OnboardingScreen. After the user dismisses the tooltip
 * (or performs the anchored action) call [onUsed] to mark it as used —
 * the tooltip will not reappear.
 *
 * @param tooltipKey  Stable SharedPreferences key, e.g. "tip_new_event".
 * @param title       Tooltip title string.
 * @param body        Tooltip body string.
 * @param onUsed      Called when the user taps the dismiss action button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeatureDiscoveryTooltip(
    tooltipKey: String,
    title: String,
    body: String,
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences(TOOLTIP_PREFS, Context.MODE_PRIVATE) }
    var alreadyShown by remember { mutableStateOf(prefs.getBoolean(tooltipKey, false)) }
    val tooltipState = rememberTooltipState(isPersistent = true)

    LaunchedEffect(alreadyShown) {
        if (!alreadyShown) {
            tooltipState.show()
        }
    }

    TooltipBox(
        positionProvider = TooltipDefaults.rememberRichTooltipPositionProvider(),
        tooltip = {
            RichTooltip(
                title = { Text(title) },
                action = {
                    TextButton(
                        onClick = {
                            prefs.edit().putBoolean(tooltipKey, true).apply()
                            alreadyShown = true
                            tooltipState.dismiss()
                        }
                    ) {
                        Text(stringResource(R.string.tooltip_dismiss))
                    }
                }
            ) {
                Text(body)
            }
        },
        state = tooltipState,
        enableUserInput = !alreadyShown
    ) {
        content()
    }
}
