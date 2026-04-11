package com.creapolis.solennix.core.designsystem.event

import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import kotlinx.coroutines.flow.Flow

/**
 * Collects one-shot [UiEvent]s from a ViewModel flow and dispatches them to a
 * Material 3 [SnackbarHostState]. Must be placed inside a `Scaffold` (or any composable
 * that owns a `SnackbarHostState`).
 *
 * For [UiEvent.Error] events with a non-null `retryActionId`, the snackbar shows a
 * "Reintentar" action that calls [onRetry] with the id when tapped.
 *
 * ```
 * val snackbarHostState = remember { SnackbarHostState() }
 * Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) {
 *     UiEventSnackbarHandler(
 *         events = viewModel.uiEvents,
 *         snackbarHostState = snackbarHostState,
 *         onRetry = viewModel::onRetry,
 *     )
 *     // ...
 * }
 * ```
 */
@Composable
fun UiEventSnackbarHandler(
    events: Flow<UiEvent>,
    snackbarHostState: SnackbarHostState,
    onRetry: (actionId: String) -> Unit = {},
) {
    LaunchedEffect(events) {
        events.collect { event ->
            when (event) {
                is UiEvent.Error -> {
                    val result = snackbarHostState.showSnackbar(
                        message = event.message,
                        actionLabel = event.retryActionId?.let { "Reintentar" },
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
                    snackbarHostState.showSnackbar(
                        message = event.message,
                        duration = SnackbarDuration.Short,
                    )
                }
            }
        }
    }
}
