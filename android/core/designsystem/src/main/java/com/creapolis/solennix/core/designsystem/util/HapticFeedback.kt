package com.creapolis.solennix.core.designsystem.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalView

/**
 * Types of haptic feedback.
 */
enum class HapticFeedbackType {
    /** Light tap feedback for button presses */
    LIGHT_TAP,
    /** Medium feedback for important actions */
    MEDIUM_TAP,
    /** Strong feedback for significant events */
    HEAVY_TAP,
    /** Success feedback for completed actions */
    SUCCESS,
    /** Warning feedback for cautionary actions */
    WARNING,
    /** Error feedback for failed actions */
    ERROR,
    /** Selection changed feedback */
    SELECTION_CHANGED,
    /** Long press feedback */
    LONG_PRESS
}

/**
 * Provides haptic feedback functionality.
 */
object HapticFeedbackManager {

    /**
     * Trigger haptic feedback of the specified type.
     */
    fun vibrate(context: Context, type: HapticFeedbackType) {
        val vibrator = getVibrator(context) ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val effect = when (type) {
                HapticFeedbackType.LIGHT_TAP -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                HapticFeedbackType.MEDIUM_TAP -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                HapticFeedbackType.HEAVY_TAP -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
                HapticFeedbackType.SUCCESS -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
                HapticFeedbackType.WARNING -> VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE)
                HapticFeedbackType.ERROR -> VibrationEffect.createWaveform(
                    longArrayOf(0, 50, 50, 50),
                    intArrayOf(0, 255, 0, 255),
                    -1
                )
                HapticFeedbackType.SELECTION_CHANGED -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                HapticFeedbackType.LONG_PRESS -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
            }
            vibrator.vibrate(effect)
        } else {
            val duration = when (type) {
                HapticFeedbackType.LIGHT_TAP -> 10L
                HapticFeedbackType.MEDIUM_TAP -> 20L
                HapticFeedbackType.HEAVY_TAP -> 50L
                HapticFeedbackType.SUCCESS -> 30L
                HapticFeedbackType.WARNING -> 100L
                HapticFeedbackType.ERROR -> 150L
                HapticFeedbackType.SELECTION_CHANGED -> 10L
                HapticFeedbackType.LONG_PRESS -> 20L
            }
            val effect = VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE)
            vibrator.vibrate(effect)
        }
    }

    /**
     * Trigger haptic feedback using View's built-in support.
     */
    fun performHapticFeedback(view: View, type: HapticFeedbackType) {
        // CONFIRM and REJECT require API 30; fall back to equivalent constants on API 26–29.
        val feedbackConstant = when (type) {
            HapticFeedbackType.LIGHT_TAP -> HapticFeedbackConstants.KEYBOARD_TAP
            HapticFeedbackType.MEDIUM_TAP -> HapticFeedbackConstants.VIRTUAL_KEY
            HapticFeedbackType.HEAVY_TAP -> HapticFeedbackConstants.LONG_PRESS
            HapticFeedbackType.SUCCESS ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) HapticFeedbackConstants.CONFIRM
                else HapticFeedbackConstants.VIRTUAL_KEY
            HapticFeedbackType.WARNING ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) HapticFeedbackConstants.REJECT
                else HapticFeedbackConstants.LONG_PRESS
            HapticFeedbackType.ERROR ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) HapticFeedbackConstants.REJECT
                else HapticFeedbackConstants.LONG_PRESS
            HapticFeedbackType.SELECTION_CHANGED -> HapticFeedbackConstants.CLOCK_TICK
            HapticFeedbackType.LONG_PRESS -> HapticFeedbackConstants.LONG_PRESS
        }
        view.performHapticFeedback(feedbackConstant)
    }

    private fun getVibrator(context: Context): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }
}

/**
 * Composable helper for haptic feedback using the current view.
 */
@Composable
fun rememberHapticFeedback(): (HapticFeedbackType) -> Unit {
    val view = LocalView.current
    return { type ->
        HapticFeedbackManager.performHapticFeedback(view, type)
    }
}
