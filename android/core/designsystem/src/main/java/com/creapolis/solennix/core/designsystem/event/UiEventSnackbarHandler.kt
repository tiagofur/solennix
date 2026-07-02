package com.creapolis.solennix.core.designsystem.event

import androidx.compose.material3.SnackbarData
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import com.creapolis.solennix.core.designsystem.R
import com.creapolis.solennix.core.designsystem.component.SnackbarVariant
import com.creapolis.solennix.core.designsystem.component.SolennixSnackbar
import kotlinx.coroutines.flow.Flow

/**
 * Shared controller pairing a [SnackbarHostState] with the [SnackbarVariant] of the
 * currently shown snackbar. The handler sets [currentVariant] right before invoking
 * [SnackbarHostState.showSnackbar]; the host reads it when rendering, so the styled
 * snackbar's icon and accent match the originating [UiEvent].
 *
 * Create with [rememberSnackbarController], pass `controller.hostState` to the
 * `Scaffold(snackbarHost = ...)` (wrapped via [SolennixSnackbarHost]) and `controller`
 * to [UiEventSnackbarHandler].
 */
class SnackbarController(
    val hostState: SnackbarHostState,
) {
    /**
     * Variant to apply to the next/current snackbar. Set this right before calling
     * [hostState.showSnackbar]; the styled host reads it when rendering.
     */
    var currentVariant: SnackbarVariant by mutableStateOf(SnackbarVariant.INFO)
}

/**
 * Remembers a [SnackbarController] bound to a fresh [SnackbarHostState].
 */
@Composable
fun rememberSnackbarController(): SnackbarController {
    val hostState = remember { SnackbarHostState() }
    return remember(hostState) { SnackbarController(hostState) }
}

/**
 * Collects one-shot [UiEvent]s from a ViewModel flow and dispatches them to a
 * Material 3 [SnackbarHostState]. Place the corresponding host inside a `Scaffold`
 * (or any composable that owns a [SnackbarHostState]).
 *
 * Pass a [controller] created with [rememberSnackbarController] so the screen's host
 * can read the variant of the in-flight snackbar (see
 * [com.creapolis.solennix.core.designsystem.component.SolennixSnackbar]).
 *
 * ```
 * val controller = rememberSnackbarController()
 * Scaffold(snackbarHost = { SolennixSnackbarHost(controller) }) {
 *     UiEventSnackbarHandler(
 *         events = viewModel.uiEvents,
 *         controller = controller,
 *         onRetry = viewModel::onRetry,
 *     )
 * }
 * ```
 */
@Composable
fun UiEventSnackbarHandler(
    events: Flow<UiEvent>,
    controller: SnackbarController,
    onRetry: (actionId: String) -> Unit = {},
    onUndo: (actionId: String) -> Unit = {},
    onActionInfo: () -> Unit = {},
    onActionWarning: () -> Unit = {},
) {
    val retryActionLabel = stringResource(R.string.common_retry)
    val undoActionLabel = stringResource(R.string.common_undo)

    LaunchedEffect(events, retryActionLabel, undoActionLabel) {
        collectUiEvents(
            events = events,
            hostState = controller.hostState,
            setVariant = { controller.currentVariant = it },
            retryActionLabel = retryActionLabel,
            undoActionLabel = undoActionLabel,
            onRetry = onRetry,
            onUndo = onUndo,
            onActionInfo = onActionInfo,
            onActionWarning = onActionWarning,
        )
    }
}

/**
 * Legacy overload that binds directly to a [SnackbarHostState] (no variant tracking).
 * Kept for screens that haven't migrated to [SolennixSnackbarHost] yet; behaves like
 * the pre-styled handler. Prefer the [SnackbarController] overload for new screens.
 */
@Composable
fun UiEventSnackbarHandler(
    events: Flow<UiEvent>,
    snackbarHostState: SnackbarHostState,
    onRetry: (actionId: String) -> Unit = {},
    onUndo: (actionId: String) -> Unit = {},
) {
    val retryActionLabel = stringResource(R.string.common_retry)
    val undoActionLabel = stringResource(R.string.common_undo)

    LaunchedEffect(events, retryActionLabel, undoActionLabel) {
        collectUiEvents(
            events = events,
            hostState = snackbarHostState,
            setVariant = {},
            retryActionLabel = retryActionLabel,
            undoActionLabel = undoActionLabel,
            onRetry = onRetry,
            onUndo = onUndo,
            onActionInfo = {},
            onActionWarning = {},
        )
    }
}

private suspend fun collectUiEvents(
    events: Flow<UiEvent>,
    hostState: SnackbarHostState,
    setVariant: (SnackbarVariant) -> Unit,
    retryActionLabel: String,
    undoActionLabel: String,
    onRetry: (actionId: String) -> Unit,
    onUndo: (actionId: String) -> Unit,
    onActionInfo: () -> Unit,
    onActionWarning: () -> Unit,
) {
    events.collect { event ->
        when (event) {
            is UiEvent.Error -> {
                setVariant(SnackbarVariant.ERROR)
                val result = hostState.showSnackbar(
                    message = event.message,
                    actionLabel = event.retryActionId?.let { retryActionLabel },
                    withDismissAction = true,
                    duration = SnackbarDuration.Long,
                )
                if (
                    result == SnackbarResult.ActionPerformed &&
                    event.retryActionId != null
                ) {
                    onRetry(event.retryActionId)
                }
            }
            is UiEvent.Success -> {
                setVariant(SnackbarVariant.SUCCESS)
                hostState.showSnackbar(
                    message = event.message,
                    duration = SnackbarDuration.Short,
                )
            }
            is UiEvent.PendingDelete -> {
                setVariant(SnackbarVariant.WARNING)
                val result = hostState.showSnackbar(
                    message = event.message,
                    actionLabel = undoActionLabel,
                    withDismissAction = true,
                    duration = SnackbarDuration.Long,
                )
                if (result == SnackbarResult.ActionPerformed) {
                    onUndo(event.undoActionId)
                }
            }
            is UiEvent.Info -> {
                setVariant(SnackbarVariant.INFO)
                val result = hostState.showSnackbar(
                    message = event.message,
                    actionLabel = event.actionLabel,
                    withDismissAction = event.actionLabel != null,
                    duration = SnackbarDuration.Long,
                )
                if (result == SnackbarResult.ActionPerformed) {
                    onActionInfo()
                }
            }
            is UiEvent.Warning -> {
                setVariant(SnackbarVariant.WARNING)
                val result = hostState.showSnackbar(
                    message = event.message,
                    actionLabel = event.actionLabel,
                    withDismissAction = event.actionLabel != null,
                    duration = SnackbarDuration.Long,
                )
                if (result == SnackbarResult.ActionPerformed) {
                    onActionWarning()
                }
            }
        }
    }
}

/**
 * A [SnackbarHost] that paints each pending snackbar through
 * [com.creapolis.solennix.core.designsystem.component.SolennixSnackbar], using the
 * [SnackbarController]'s tracked variant. Drop-in replacement for the stock
 * `SnackbarHost(hostState)` inside a `Scaffold`.
 */
@Composable
fun SolennixSnackbarHost(
    controller: SnackbarController,
    modifier: androidx.compose.ui.Modifier = androidx.compose.ui.Modifier,
) {
    SnackbarHost(
        hostState = controller.hostState,
        modifier = modifier,
    ) { data: SnackbarData ->
        SolennixSnackbar(snackbarData = data, variant = controller.currentVariant)
    }
}
