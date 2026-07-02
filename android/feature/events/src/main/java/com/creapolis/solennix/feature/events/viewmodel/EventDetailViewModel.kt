package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import androidx.annotation.StringRes
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DuplicateEventData
import com.creapolis.solennix.core.model.DuplicateEventDataHolder
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventEquipment
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventPhoto
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.EventStaff
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.EventDayNotificationManager
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EventDetailUiState(
    val event: Event? = null,
    val client: Client? = null,
    val products: List<EventProduct> = emptyList(),
    val extras: List<EventExtra> = emptyList(),
    val equipment: List<EventEquipment> = emptyList(),
    val supplies: List<EventSupply> = emptyList(),
    val staff: List<EventStaff> = emptyList(),
    val payments: List<Payment> = emptyList(),
    val photos: List<EventPhoto> = emptyList(),
    val totalPaid: Double = 0.0,
    val currentUser: User? = null,
    val isLoading: Boolean = false,
    val isPhotosLoading: Boolean = false,
    val isPhotoUploading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class EventDetailViewModel @Inject constructor(
    @ApplicationContext internal val appContext: Context,
    internal val eventRepository: EventRepository,
    internal val clientRepository: ClientRepository,
    internal val paymentRepository: PaymentRepository,
    internal val staffRepository: StaffRepository,
    internal val apiService: ApiService,
    internal val authManager: AuthManager,
    internal val eventDayNotificationManager: EventDayNotificationManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    internal fun tr(@StringRes id: Int, vararg args: Any): String = appContext.getString(id, *args)

    internal val eventId: String = checkNotNull(savedStateHandle["eventId"])

    private val _isLoading = MutableStateFlow(true)
    internal val _errorMessage = MutableStateFlow<String?>(null)
    internal val _event = MutableStateFlow<Event?>(null)
    internal val _client = MutableStateFlow<Client?>(null)
    private val _equipment = MutableStateFlow<List<EventEquipment>>(emptyList())
    private val _supplies = MutableStateFlow<List<EventSupply>>(emptyList())
    internal val _photos = MutableStateFlow<List<EventPhoto>>(emptyList())
    internal val _isPhotosLoading = MutableStateFlow(false)
    internal val _isPhotoUploading = MutableStateFlow(false)

    val uiState: StateFlow<EventDetailUiState> = combine(
        combine(
            _event,
            _client,
            ::Pair
        ),
        combine(
            eventRepository.getEventProducts(eventId),
            eventRepository.getEventExtras(eventId),
            ::Pair
        ),
        combine(
            paymentRepository.getPaymentsByEventId(eventId),
            _equipment,
            _supplies,
            ::Triple
        ),
        combine(
            _photos,
            _isPhotosLoading,
            _isPhotoUploading,
            staffRepository.getEventStaff(eventId)
        ) { photos, isPhotosLoading, isPhotoUploading, staff ->
            PhotosAndStaff(photos, isPhotosLoading, isPhotoUploading, staff)
        },
        combine(
            _isLoading,
            _errorMessage,
            ::Pair
        )
    ) { (event, client), (products, extras), (payments, equipment, supplies), photosAndStaff, (isLoading, errorMessage) ->
        EventDetailUiState(
            event = event,
            client = client,
            products = products,
            extras = extras,
            equipment = equipment,
            supplies = supplies,
            staff = photosAndStaff.staff,
            payments = payments,
            photos = photosAndStaff.photos,
            totalPaid = payments.sumOf { it.amount },
            currentUser = authManager.currentUser.value,
            isLoading = isLoading,
            isPhotosLoading = photosAndStaff.isPhotosLoading,
            isPhotoUploading = photosAndStaff.isPhotoUploading,
            errorMessage = errorMessage
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = EventDetailUiState(isLoading = true)
    )

    init {
        loadEvent()
        viewModelScope.launch {
            eventRepository.observeEvent(eventId).collect { updated ->
                if (updated != null && updated != _event.value) {
                    _event.value = updated
                }
            }
        }
    }

    fun loadEvent() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                try {
                    paymentRepository.syncPaymentsByEventId(eventId)
                    eventRepository.syncEventItems(eventId)
                } catch (e: Exception) {
                    // Network sync errors are non-fatal, continue with cached data
                }

                val event = eventRepository.getEvent(eventId)
                _event.value = event

                event?.clientId?.let { clientId ->
                    _client.value = clientRepository.getClient(clientId)
                }

                loadEquipmentAndSupplies()

                try {
                    staffRepository.syncEventStaff(eventId)
                } catch (_: Exception) {
                    // El Flow ya emite lo que haya en Room
                }

                checkAndShowEventDayNotification(event, _client.value)

                _isLoading.value = false
            } catch (e: Exception) {
                _errorMessage.value = e.message
                _isLoading.value = false
            }
        }
    }

    /**
     * Refreshes event data silently — does NOT toggle [_isLoading], so the screen
     * keeps showing its current content. Use this for incremental updates (e.g.
     * after adding or deleting a payment) to avoid the full-screen spinner.
     */
    internal fun reloadEventSilently() {
        viewModelScope.launch {
            try {
                paymentRepository.syncPaymentsByEventId(eventId)
                eventRepository.syncEventItems(eventId)
            } catch (_: Exception) {
                // Sync errors are non-fatal; local data stays visible
            }
            try {
                val event = eventRepository.getEvent(eventId)
                _event.value = event
                event?.clientId?.let { clientId ->
                    _client.value = clientRepository.getClient(clientId)
                }
                loadEquipmentAndSupplies()
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    private suspend fun loadEquipmentAndSupplies() {
        coroutineScope {
            val equipmentDeferred = async {
                try {
                    apiService.get<List<EventEquipment>>(Endpoints.eventEquipment(eventId))
                } catch (_: Exception) {
                    emptyList()
                }
            }
            val suppliesDeferred = async {
                try {
                    apiService.get<List<EventSupply>>(Endpoints.eventSupplies(eventId))
                } catch (_: Exception) {
                    emptyList()
                }
            }
            _equipment.value = equipmentDeferred.await()
            _supplies.value = suppliesDeferred.await()
        }
    }

    fun updateEventStatus(newStatus: EventStatus) {
        viewModelScope.launch {
            try {
                val currentEvent = _event.value ?: return@launch
                val updated = currentEvent.copy(status = newStatus)
                eventRepository.updateEvent(updated)
                _event.value = updated
            } catch (e: Exception) {
                _errorMessage.value = translateStatusError(e.message.orEmpty())
            }
        }
    }

    /**
     * Maps a backend status-change failure to a localized message. Mirrors the handling
     * in `EventListViewModel.updateEventStatus`: if the backend rejected the transition
     * to "completed" because of a pending balance (message
     * `"Cannot complete: $XXX.XX remaining"`), the amount is extracted and rendered via
     * [R.string.events_error_balance_pending]. Otherwise a generic localized fallback
     * is shown — never the raw English backend string.
     */
    private fun translateStatusError(rawMessage: String): String {
        val balanceMatch = Regex("Cannot complete: \\$([\\d,]+\\.?\\d*) remaining").find(rawMessage)
        return if (balanceMatch != null) {
            val amount = balanceMatch.groupValues[1]
            tr(DesignSystemR.string.events_error_balance_pending, amount)
        } else {
            // Generic, localized fallback — never surface the raw backend message.
            tr(R.string.events_list_error_change_status)
        }
    }

    fun prepareDuplicate(): Boolean {
        val currentState = uiState.value
        val event = currentState.event ?: return false
        DuplicateEventDataHolder.pendingData = DuplicateEventData(
            event = event,
            products = currentState.products,
            extras = currentState.extras,
            equipment = currentState.equipment,
            supplies = currentState.supplies
        )
        return true
    }

    var deleteSuccess by mutableStateOf(false)
        private set

    /** Reset after the delete-success side effect has been consumed by the UI. */
    fun consumeDeleteSuccess() {
        deleteSuccess = false
    }

    /** One-shot flag: set true after payment is successfully added; consumed by the UI. */
    var addPaymentSuccess by mutableStateOf(false)
        internal set

    /** Reset after the add-payment-success side effect has been consumed by the UI. */
    fun consumeAddPaymentSuccess() {
        addPaymentSuccess = false
    }

    /** One-shot flag: set true after payment is successfully deleted; consumed by the UI. */
    var deletePaymentSuccess by mutableStateOf(false)
        internal set

    /** Reset after the delete-payment-success side effect has been consumed by the UI. */
    fun consumeDeletePaymentSuccess() {
        deletePaymentSuccess = false
    }

    fun deleteEvent() {
        viewModelScope.launch {
            try {
                eventRepository.deleteEvent(eventId)
                deleteSuccess = true
            } catch (e: Exception) {
                _errorMessage.value = tr(R.string.events_detail_error_delete_event, e.message.orEmpty())
            }
        }
    }

    /** Clears [EventDetailUiState.errorMessage] after it has been shown in the UI. */
    fun onErrorShown() {
        _errorMessage.value = null
    }

    suspend fun downloadEventPdf(type: String): ByteArray =
        apiService.getBytes(Endpoints.eventPdf(eventId, type))
}

private data class PhotosAndStaff(
    val photos: List<EventPhoto>,
    val isPhotosLoading: Boolean,
    val isPhotoUploading: Boolean,
    val staff: List<EventStaff>
)
