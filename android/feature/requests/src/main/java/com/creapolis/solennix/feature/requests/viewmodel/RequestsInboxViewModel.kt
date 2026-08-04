package com.creapolis.solennix.feature.requests.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.ConvertEventEnvelope
import com.creapolis.solennix.core.model.CursorPaginatedPublicRequests
import com.creapolis.solennix.core.model.DeclinePublicRequestBody
import com.creapolis.solennix.core.model.EmptyJsonBody
import com.creapolis.solennix.core.model.OkEnvelope
import com.creapolis.solennix.core.model.PublicRequest
import com.creapolis.solennix.core.model.PublicRequestDetailData
import com.creapolis.solennix.core.model.PublicRequestDetailEnvelope
import com.creapolis.solennix.core.model.PublicResponse
import com.creapolis.solennix.core.model.RespondPublicRequestBody
import com.creapolis.solennix.core.model.UnreadCountEnvelope
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Locale
import javax.inject.Inject

enum class RequestsStatusFilter(val queryStatus: String?) {
    ALL(null),
    PENDING("pending"),
    RESPONDED("responded"),
    BOOKED("booked")
}

data class RequestsInboxUiState(
    val items: List<PublicRequest> = emptyList(),
    val statusFilter: RequestsStatusFilter = RequestsStatusFilter.ALL,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = false,
    val unreadCount: Int = 0,
    val error: String? = null,
    val detail: PublicRequestDetailData? = null,
    val isLoadingDetail: Boolean = false,
    val actionInFlight: Boolean = false,
    val actionError: String? = null,
    val actionSuccess: String? = null,
    /** Set after convert-to-event succeeds so UI can navigate (#1125). */
    val convertedEventId: String? = null
)

@HiltViewModel
class RequestsInboxViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(RequestsInboxUiState())
    val uiState: StateFlow<RequestsInboxUiState> = _uiState.asStateFlow()

    private var nextCursor: String? = null
    private val pageLimit = 20

    init {
        refresh()
    }

    fun refresh() {
        nextCursor = null
        viewModelScope.launch {
            load(reset = true, isRefresh = true)
            refreshUnreadCount()
        }
    }

    fun applyFilter(filter: RequestsStatusFilter) {
        if (filter == _uiState.value.statusFilter) return
        nextCursor = null
        _uiState.update { it.copy(statusFilter = filter, items = emptyList()) }
        viewModelScope.launch { load(reset = true, isRefresh = false) }
    }

    fun loadMoreIfNeeded(lastVisibleId: String?) {
        val state = _uiState.value
        if (!state.hasMore || state.isLoadingMore || state.isLoading || state.isRefreshing) return
        val last = state.items.lastOrNull() ?: return
        if (lastVisibleId != null && lastVisibleId != last.id) return
        viewModelScope.launch { load(reset = false, isRefresh = false) }
    }

    private suspend fun load(reset: Boolean, isRefresh: Boolean) {
        _uiState.update {
            it.copy(
                isLoading = reset && !isRefresh,
                isRefreshing = isRefresh,
                isLoadingMore = !reset,
                error = if (reset) null else it.error
            )
        }
        try {
            val params = buildMap {
                put("cursor", nextCursor.orEmpty())
                put("limit", pageLimit.toString())
                put("pagination", "cursor")
                _uiState.value.statusFilter.queryStatus?.let { put("status", it) }
            }
            val page = apiService.get<CursorPaginatedPublicRequests>(
                "organizers/me/requests",
                params
            )
            nextCursor = page.nextCursor
            _uiState.update { state ->
                val merged = if (reset) {
                    page.data
                } else {
                    val existing = state.items.map { it.id }.toSet()
                    state.items + page.data.filter { it.id !in existing }
                }
                state.copy(
                    items = merged,
                    hasMore = page.hasMore,
                    isLoading = false,
                    isRefreshing = false,
                    isLoadingMore = false,
                    error = null
                )
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    isRefreshing = false,
                    isLoadingMore = false,
                    error = e.message?.takeIf { m -> m.isNotBlank() }
                        ?: if (isSpanish()) "Error al cargar solicitudes" else "Failed to load requests"
                )
            }
        }
    }

    private suspend fun refreshUnreadCount() {
        try {
            val envelope = apiService.get<UnreadCountEnvelope>("organizers/me/requests/unread-count")
            _uiState.update { it.copy(unreadCount = envelope.data.count) }
        } catch (_: Exception) {
            // Badge is best-effort
        }
    }

    fun loadDetail(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingDetail = true, actionError = null) }
            try {
                val envelope = apiService.get<PublicRequestDetailEnvelope>("organizers/me/requests/$id")
                _uiState.update { it.copy(detail = envelope.data, isLoadingDetail = false) }
                if (!envelope.data.request.isRead) {
                    markRead(id)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingDetail = false,
                        actionError = e.message?.takeIf { m -> m.isNotBlank() }
                            ?: if (isSpanish()) "Error al cargar detalle" else "Failed to load detail"
                    )
                }
            }
        }
    }

    fun clearDetail() {
        _uiState.update { it.copy(detail = null) }
    }

    fun clearActionMessages() {
        _uiState.update { it.copy(actionError = null, actionSuccess = null) }
    }

    private fun markRead(id: String) {
        viewModelScope.launch {
            try {
                apiService.post<OkEnvelope>("organizers/me/requests/$id/read", EmptyJsonBody())
                _uiState.update { state ->
                    val items = state.items.map { if (it.id == id) it.copy(isRead = true) else it }
                    val detail = state.detail?.let { d ->
                        if (d.request.id == id) d.copy(request = d.request.copy(isRead = true)) else d
                    }
                    val unread = if (state.unreadCount > 0) state.unreadCount - 1 else 0
                    state.copy(items = items, detail = detail, unreadCount = unread)
                }
            } catch (_: Exception) {
                // non-blocking
            }
        }
    }

    fun respond(
        id: String,
        amount: Double,
        currency: String = "MXN",
        inclusions: List<String> = emptyList(),
        validUntil: String? = null,
        message: String?
    ) {
        if (_uiState.value.actionInFlight) return
        viewModelScope.launch {
            _uiState.update { it.copy(actionInFlight = true, actionError = null) }
            try {
                apiService.post<Map<String, PublicResponse>>(
                    "organizers/me/requests/$id/responses",
                    RespondPublicRequestBody(
                        quoteAmount = amount,
                        currency = currency.ifBlank { "MXN" },
                        inclusions = inclusions,
                        validUntil = validUntil ?: defaultValidUntil(),
                        message = message
                    )
                )
                loadDetail(id)
                refresh()
                _uiState.update {
                    it.copy(
                        actionInFlight = false,
                        actionSuccess = if (isSpanish()) "Cotización enviada" else "Quote sent"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(actionInFlight = false, actionError = e.message ?: "Error")
                }
            }
        }
    }

    fun requestInfo(id: String) {
        if (_uiState.value.actionInFlight) return
        viewModelScope.launch {
            _uiState.update { it.copy(actionInFlight = true, actionError = null) }
            try {
                apiService.post<OkEnvelope>("organizers/me/requests/$id/request-info", EmptyJsonBody())
                loadDetail(id)
                refresh()
                _uiState.update {
                    it.copy(
                        actionInFlight = false,
                        actionSuccess = if (isSpanish()) "Se pidió más información" else "Info requested"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(actionInFlight = false, actionError = e.message ?: "Error")
                }
            }
        }
    }

    fun decline(id: String, reason: String?) {
        if (_uiState.value.actionInFlight) return
        viewModelScope.launch {
            _uiState.update { it.copy(actionInFlight = true, actionError = null) }
            try {
                apiService.post<OkEnvelope>(
                    "organizers/me/requests/$id/decline",
                    DeclinePublicRequestBody(reason = reason)
                )
                loadDetail(id)
                refresh()
                _uiState.update {
                    it.copy(
                        actionInFlight = false,
                        actionSuccess = if (isSpanish()) "Solicitud declinada" else "Request declined"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(actionInFlight = false, actionError = e.message ?: "Error")
                }
            }
        }
    }

    /**
     * Converts request to Event. On success sets [RequestsInboxUiState.convertedEventId]
     * so the UI can navigate to event detail (#1125).
     */
    fun convertToEvent(id: String) {
        if (_uiState.value.actionInFlight) return
        viewModelScope.launch {
            _uiState.update { it.copy(actionInFlight = true, actionError = null, convertedEventId = null) }
            try {
                val envelope = apiService.post<ConvertEventEnvelope>(
                    "organizers/me/requests/$id/convert-to-event",
                    EmptyJsonBody()
                )
                loadDetail(id)
                refresh()
                _uiState.update {
                    it.copy(
                        actionInFlight = false,
                        convertedEventId = envelope.data.eventId,
                        actionSuccess = if (isSpanish()) "Evento creado" else "Event created"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(actionInFlight = false, actionError = e.message ?: "Error")
                }
            }
        }
    }

    fun clearConvertedEventId() {
        _uiState.update { it.copy(convertedEventId = null) }
    }

    companion object {
        fun defaultValidUntil(): String {
            val cal = java.util.Calendar.getInstance()
            cal.add(java.util.Calendar.DAY_OF_YEAR, 7)
            val y = cal.get(java.util.Calendar.YEAR)
            val m = cal.get(java.util.Calendar.MONTH) + 1
            val d = cal.get(java.util.Calendar.DAY_OF_MONTH)
            return "%04d-%02d-%02d".format(y, m, d)
        }
    }

    private fun isSpanish(): Boolean = Locale.getDefault().language.startsWith("es")
}
