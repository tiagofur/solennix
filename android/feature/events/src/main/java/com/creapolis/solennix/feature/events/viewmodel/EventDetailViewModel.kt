package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.data.util.ImageCompressor
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventEquipment
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventPhoto
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.EventDayNotificationManager
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class EventDetailUiState(
    val event: Event? = null,
    val client: Client? = null,
    val products: List<EventProduct> = emptyList(),
    val extras: List<EventExtra> = emptyList(),
    val equipment: List<EventEquipment> = emptyList(),
    val supplies: List<EventSupply> = emptyList(),
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
    private val eventRepository: EventRepository,
    private val clientRepository: ClientRepository,
    private val paymentRepository: PaymentRepository,
    private val apiService: ApiService,
    private val authManager: AuthManager,
    private val eventDayNotificationManager: EventDayNotificationManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: String = checkNotNull(savedStateHandle["eventId"])

    private val _isLoading = MutableStateFlow(true)
    private val _errorMessage = MutableStateFlow<String?>(null)
    private val _event = MutableStateFlow<Event?>(null)
    private val _client = MutableStateFlow<Client?>(null)
    private val _equipment = MutableStateFlow<List<EventEquipment>>(emptyList())
    private val _supplies = MutableStateFlow<List<EventSupply>>(emptyList())
    private val _photos = MutableStateFlow<List<EventPhoto>>(emptyList())
    private val _isPhotosLoading = MutableStateFlow(false)
    private val _isPhotoUploading = MutableStateFlow(false)

    val uiState: StateFlow<EventDetailUiState> = combine(
        _event,
        _client,
        eventRepository.getEventProducts(eventId),
        eventRepository.getEventExtras(eventId),
        paymentRepository.getPaymentsByEventId(eventId),
        _isLoading,
        _errorMessage,
        _photos,
        _isPhotosLoading,
        _isPhotoUploading,
        _equipment,
        _supplies
    ) { values ->
        val event = values[0] as Event?
        val client = values[1] as Client?
        @Suppress("UNCHECKED_CAST")
        val products = values[2] as List<EventProduct>
        @Suppress("UNCHECKED_CAST")
        val extras = values[3] as List<EventExtra>
        @Suppress("UNCHECKED_CAST")
        val payments = values[4] as List<Payment>
        val isLoading = values[5] as Boolean
        val errorMessage = values[6] as String?
        @Suppress("UNCHECKED_CAST")
        val photos = values[7] as List<EventPhoto>
        val isPhotosLoading = values[8] as Boolean
        val isPhotoUploading = values[9] as Boolean
        @Suppress("UNCHECKED_CAST")
        val equipment = values[10] as List<EventEquipment>
        @Suppress("UNCHECKED_CAST")
        val supplies = values[11] as List<EventSupply>

        EventDetailUiState(
            event = event,
            client = client,
            products = products,
            extras = extras,
            equipment = equipment,
            supplies = supplies,
            payments = payments,
            photos = photos,
            totalPaid = payments.sumOf { it.amount },
            currentUser = authManager.currentUser.value,
            isLoading = isLoading,
            isPhotosLoading = isPhotosLoading,
            isPhotoUploading = isPhotoUploading,
            errorMessage = errorMessage
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = EventDetailUiState(isLoading = true)
    )

    init {
        loadEvent()
        // Keep _event in sync with Room so status changes from other screens reflect immediately
        viewModelScope.launch {
            eventRepository.getEvents().collect { events ->
                val updated = events.find { it.id == eventId }
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
                // Sync from API in background
                try {
                    paymentRepository.syncPaymentsByEventId(eventId)
                    eventRepository.syncEventItems(eventId)
                } catch (e: Exception) {
                    // Network sync errors are non-fatal, continue with cached data
                }

                // Load event data
                val event = eventRepository.getEvent(eventId)
                _event.value = event

                // Load client data
                event?.clientId?.let { clientId ->
                    _client.value = clientRepository.getClient(clientId)
                }

                // Load equipment and supplies from API
                loadEquipmentAndSupplies()

                // Auto-mostrar notificacion persistente si el evento es hoy y confirmado
                checkAndShowEventDayNotification(event, _client.value)

                _isLoading.value = false
            } catch (e: Exception) {
                _errorMessage.value = e.message
                _isLoading.value = false
            }
        }
    }

    private suspend fun loadEquipmentAndSupplies() {
        try {
            val equipment: List<EventEquipment> = apiService.get(Endpoints.eventEquipment(eventId))
            _equipment.value = equipment
        } catch (e: Exception) {
            // Non-fatal, equipment may not exist for this event
            _equipment.value = emptyList()
        }

        try {
            val supplies: List<EventSupply> = apiService.get(Endpoints.eventSupplies(eventId))
            _supplies.value = supplies
        } catch (e: Exception) {
            // Non-fatal, supplies may not exist for this event
            _supplies.value = emptyList()
        }
    }

    fun addPayment(amount: Double, method: String, notes: String?, date: String? = null) {
        if (amount <= 0) {
            _errorMessage.value = "El monto debe ser mayor a 0"
            return
        }
        if (method.isBlank()) {
            _errorMessage.value = "Selecciona un método de pago"
            return
        }
        viewModelScope.launch {
            try {
                val currentEvent = _event.value
                val newPayment = Payment(
                    id = "", // Backend will generate or override if empty
                    eventId = eventId,
                    userId = currentEvent?.userId ?: "",
                    amount = amount,
                    paymentDate = date ?: java.time.LocalDate.now().toString(),
                    paymentMethod = method,
                    notes = notes,
                    createdAt = ""
                )
                paymentRepository.createPayment(newPayment)
                // Flow automatically updates via Room -> paymentRepository.getPaymentsByEventId

                // Auto status change: if event is "quoted", change to "confirmed" on first payment
                if (currentEvent != null && currentEvent.status == EventStatus.QUOTED) {
                    val updated = currentEvent.copy(status = EventStatus.CONFIRMED)
                    eventRepository.updateEvent(updated)
                    _event.value = updated
                }
            } catch (e: Exception) {
                _errorMessage.value = "Error adding payment: ${e.message}"
            }
        }
    }

    fun deletePayment(paymentId: String) {
        viewModelScope.launch {
            try {
                paymentRepository.deletePayment(paymentId)
                // Flow automatically updates via Room -> paymentRepository.getPaymentsByEventId
            } catch (e: Exception) {
                _errorMessage.value = "Error al eliminar pago: ${e.message}"
            }
        }
    }

    fun loadPhotos() {
        viewModelScope.launch {
            _isPhotosLoading.value = true
            try {
                val photos = eventRepository.getEventPhotos(eventId)
                _photos.value = photos
            } catch (e: Exception) {
                _errorMessage.value = "Error loading photos: ${e.message}"
            } finally {
                _isPhotosLoading.value = false
            }
        }
    }

    fun uploadPhoto(context: Context, uri: Uri, caption: String? = null) {
        viewModelScope.launch {
            _isPhotoUploading.value = true
            try {
                val contentResolver = context.contentResolver
                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                val fileName = getFileName(context, uri) ?: "event_photo.jpg"
                val inputStream = contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()

                if (bytes != null) {
                    // 1. Center-crop to 4:3 and compress image for consistent gallery layout
                    val compressedBytes = withContext(Dispatchers.Default) {
                        ImageCompressor.compress(
                            bytes = bytes,
                            cropAspectRatio = 4 to 3
                        )
                    }

                    // 2. Upload to storage
                    val uploadResponse = eventRepository.uploadImage(
                        compressedBytes,
                        fileName,
                        mimeType
                    )

                    // 3. Register photo in event
                    val newPhoto = eventRepository.uploadEventPhoto(
                        eventId,
                        uploadResponse.url,
                        caption
                    )
                    _photos.value = _photos.value + newPhoto
                } else {
                    _errorMessage.value = "No se pudo leer la imagen seleccionada"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Error uploading photo: ${e.message}"
            } finally {
                _isPhotoUploading.value = false
            }
        }
    }

    private fun getFileName(context: Context, uri: Uri): String? {
        var name: String? = null
        val cursor = context.contentResolver.query(uri, null, null, null, null)
        cursor?.use {
            if (it.moveToFirst()) {
                val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    name = it.getString(index)
                }
            }
        }
        return name
    }

    fun deletePhoto(photo: EventPhoto) {
        viewModelScope.launch {
            try {
                eventRepository.deleteEventPhoto(eventId, photo.id)
                _photos.value = _photos.value.filter { it.id != photo.id }
            } catch (e: Exception) {
                _errorMessage.value = "Error deleting photo: ${e.message}"
            }
        }
    }

    /**
     * Muestra la notificacion persistente del evento del dia.
     */
    fun startEventDayNotification() {
        val event = _event.value ?: return
        val client = _client.value ?: return
        eventDayNotificationManager.showEventNotification(event, client)
    }

    /**
     * Cancela la notificacion persistente del evento del dia.
     */
    fun stopEventDayNotification() {
        eventDayNotificationManager.dismissEventNotification(eventId)
    }

    /**
     * Verifica si el evento es hoy y esta confirmado para mostrar notificacion automaticamente.
     */
    private fun checkAndShowEventDayNotification(event: Event?, client: Client?) {
        if (event == null || client == null) return
        val today = java.time.LocalDate.now().toString()
        if (event.eventDate == today && event.status == EventStatus.CONFIRMED) {
            eventDayNotificationManager.showEventNotification(event, client)
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
                _errorMessage.value = "Error al cambiar status: ${e.message}"
            }
        }
    }

    var deleteSuccess by mutableStateOf(false)
        private set

    fun deleteEvent() {
        viewModelScope.launch {
            try {
                eventRepository.deleteEvent(eventId)
                deleteSuccess = true
            } catch (e: Exception) {
                _errorMessage.value = "Error al eliminar evento: ${e.message}"
            }
        }
    }
}
