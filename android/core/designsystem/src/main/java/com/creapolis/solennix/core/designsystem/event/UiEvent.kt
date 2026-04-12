package com.creapolis.solennix.core.designsystem.event

/**
 * One-shot UI events emitted by a ViewModel to be shown as a Snackbar, Toast, or modal.
 *
 * Use with [UiEventSnackbarHandler] on the composable side. ViewModels expose this as a
 * `SharedFlow<UiEvent>` (not a StateFlow — we don't want re-emitting the same error on
 * recomposition).
 *
 * ```
 * // ViewModel
 * private val _uiEvents = MutableSharedFlow<UiEvent>(extraBufferCapacity = 1)
 * val uiEvents: SharedFlow<UiEvent> = _uiEvents.asSharedFlow()
 *
 * fun deleteProduct(id: String) {
 *     viewModelScope.launch {
 *         try {
 *             productRepository.deleteProduct(id)
 *         } catch (e: Exception) {
 *             _uiEvents.tryEmit(
 *                 UiEvent.Error(
 *                     message = "No se pudo borrar el producto",
 *                     retryActionId = "delete:$id",
 *                 )
 *             )
 *         }
 *     }
 * }
 * ```
 */
sealed class UiEvent {
    /**
     * Show an error snackbar. If [retryActionId] is non-null, the snackbar shows a
     * "Reintentar" action that invokes the host's retry callback with this id.
     *
     * The id is an opaque string that the ViewModel interprets in its `onRetry(actionId)`
     * handler — typically `"operationName:resourceId"`.
     */
    data class Error(
        val message: String,
        val retryActionId: String? = null,
    ) : UiEvent()

    /** Show a short, auto-dismissing success confirmation snackbar. */
    data class Success(val message: String) : UiEvent()

    /**
     * Show a snackbar with "Deshacer" action for pending deletions.
     * The item is hidden from the UI immediately. If the user taps "Deshacer",
     * [undoActionId] is passed to the host's undo callback to restore the item.
     * If dismissed without action, the deletion proceeds.
     */
    data class PendingDelete(
        val message: String,
        val undoActionId: String,
    ) : UiEvent()
}
