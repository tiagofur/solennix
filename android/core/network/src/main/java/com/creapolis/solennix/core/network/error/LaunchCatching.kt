package com.creapolis.solennix.core.network.error

import com.creapolis.solennix.core.model.ApiError
import com.creapolis.solennix.core.network.log.SolennixLogger
import com.creapolis.solennix.core.network.toApiError
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

/**
 * Launches a coroutine on this scope with uniform error handling.
 *
 * Replaces the ad-hoc `try { } catch (e: Exception) { Log.* ; _error.value = ... }`
 * boilerplate repeated across ViewModels. Guarantees:
 *
 * 1. [CancellationException] is always rethrown — structured concurrency is
 *    preserved. (Many existing handlers swallow cancellation via a bare
 *    `catch (e: Exception)`, which can leave the `viewModelScope` hanging.)
 * 2. Any other throwable is normalized to [ApiError] via [toApiError].
 * 3. The error is logged once via [SolennixLogger] (no scattered `Log.*`).
 * 4. [onError] is invoked with the typed [ApiError] so the caller maps it to
 *    its own UI state (StateFlow, UiEvent, etc.).
 *
 * Usage:
 * ```
 * viewModelScope.launchCatching(logger, onError = { _error.value = it.toMessage() }) {
 *     eventRepository.syncEvents()
 * }
 * ```
 */
fun CoroutineScope.launchCatching(
    logger: SolennixLogger,
    context: CoroutineContext = EmptyCoroutineContext,
    onError: (ApiError) -> Unit,
    block: suspend CoroutineScope.() -> Unit
): Job = launch(context) {
    try {
        block()
    } catch (e: CancellationException) {
        throw e
    } catch (e: ApiError) {
        logger.w(TAG, "API error: ${e::class.simpleName}", e)
        onError(e)
    } catch (e: Throwable) {
        val mapped = e.toApiError()
        logger.w(TAG, "mapped to ${mapped::class.simpleName}", e)
        onError(mapped)
    }
}

private const val TAG = "LaunchCatching"
