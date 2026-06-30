package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import androidx.annotation.StringRes
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.data.repository.StaffTeamRepository
import com.creapolis.solennix.core.designsystem.event.UiEvent
import com.creapolis.solennix.core.model.*
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.SolennixException
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.events.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
class EventFormViewModel @Inject constructor(
    @ApplicationContext internal val appContext: Context,
    internal val eventRepository: EventRepository,
    internal val clientRepository: ClientRepository,
    internal val productRepository: ProductRepository,
    internal val inventoryRepository: InventoryRepository,
    internal val staffRepository: StaffRepository,
    internal val staffTeamRepository: StaffTeamRepository,
    internal val apiService: ApiService,
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    internal fun tr(@StringRes id: Int, vararg args: Any): String = appContext.getString(id, *args)

    internal val eventId: String? = savedStateHandle.get<String>("eventId")?.takeIf { it.isNotBlank() }
    val isEditMode: Boolean = eventId != null

    // Plan limit check
    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set
    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached

    var isLoadingEvent by mutableStateOf(false)

    var loadError by mutableStateOf<String?>(null)
        private set

    private val _uiEvents = MutableSharedFlow<UiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<UiEvent> = _uiEvents.asSharedFlow()

    internal fun triggerErrorEvent(message: String) {
        _uiEvents.tryEmit(UiEvent.Error(message = message, retryActionId = null))
    }

    // Step 1: General Info
    var selectedClient by mutableStateOf<Client?>(null)
    var eventDate by mutableStateOf(LocalDate.now())
    var startTime by mutableStateOf("")
    var endTime by mutableStateOf("")
    var status by mutableStateOf(EventStatus.QUOTED)
    var serviceType by mutableStateOf("")
    var numPeople by mutableStateOf("0")

    // Client Picker Logic
    private val _clientSearchQuery = MutableStateFlow("")
    val clientSearchQuery = _clientSearchQuery.asStateFlow()
    
    val filteredClients: StateFlow<List<Client>> = _clientSearchQuery
        .debounce(300)
        .flatMapLatest { query ->
            if (query.isBlank()) clientRepository.getClients()
            else clientRepository.getClients().map { clients ->
                clients.filter { it.name.contains(query, ignoreCase = true) }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun onClientSearchQueryChange(query: String) {
        _clientSearchQuery.value = query
    }

    // Quick client creation
    var isCreatingClient by mutableStateOf(false)
    var quickClientError by mutableStateOf<String?>(null)

    fun createQuickClient(name: String, email: String, phone: String) {
        if (name.isBlank()) {
            quickClientError = tr(R.string.events_form_error_quick_client_name_required)
            return
        }
        viewModelScope.launch {
            isCreatingClient = true
            quickClientError = null
            try {
                val newClient = Client(
                    id = UUID.randomUUID().toString(),
                    userId = "",
                    name = name,
                    phone = phone,
                    email = email.takeIf { it.isNotBlank() },
                    createdAt = "",
                    updatedAt = ""
                )
                val savedClient = clientRepository.createClient(newClient)
                selectedClient = savedClient
                _clientSearchQuery.value = ""
            } catch (e: Exception) {
                quickClientError = tr(R.string.events_form_error_quick_client_create, e.message.orEmpty())
            } finally {
                isCreatingClient = false
            }
        }
    }

    // Step 2: Products
    val selectedProducts = mutableStateListOf<EventProduct>()
    private val _availableProducts = MutableStateFlow<List<Product>>(emptyList())
    val availableProducts: StateFlow<List<Product>> = _availableProducts.asStateFlow()
    var isLoadingProducts by mutableStateOf(false)
        private set
    var productLoadError by mutableStateOf<String?>(null)
        private set
    private var loadProductsJob: Job? = null

    // Step 3: Extras
    val eventExtras = mutableStateListOf<EventExtra>()
    var discount by mutableStateOf("0")
    var discountType by mutableStateOf(DiscountType.PERCENT)

    // Step 4: Equipment
    val selectedEquipment = mutableStateListOf<EventEquipment>()
    
    internal val internalEquipmentConflicts = MutableStateFlow<List<EquipmentConflict>>(emptyList())
    val equipmentConflicts: StateFlow<List<EquipmentConflict>> = internalEquipmentConflicts.asStateFlow()
    
    internal val internalEquipmentSuggestions = MutableStateFlow<List<EquipmentSuggestion>>(emptyList())
    val equipmentSuggestions: StateFlow<List<EquipmentSuggestion>> = internalEquipmentSuggestions.asStateFlow()
    
    private val _availableEquipment = MutableStateFlow<List<InventoryItem>>(emptyList())
    val availableEquipment: StateFlow<List<InventoryItem>> = _availableEquipment.asStateFlow()
    var isCheckingConflicts by mutableStateOf(false)

    // Step 5: Supplies
    val selectedSupplies = mutableStateListOf<EventSupply>()
    
    internal val internalSupplySuggestions = MutableStateFlow<List<SupplySuggestion>>(emptyList())
    val supplySuggestions: StateFlow<List<SupplySuggestion>> = internalSupplySuggestions.asStateFlow()
    
    private val _availableSupplies = MutableStateFlow<List<InventoryItem>>(emptyList())
    val availableSupplies: StateFlow<List<InventoryItem>> = _availableSupplies.asStateFlow()

    // Step 5b: Staff
    val selectedStaff = mutableStateListOf<SelectedStaffAssignment>()
    
    internal val internalAvailableStaff = MutableStateFlow<List<Staff>>(emptyList())
    val availableStaff: StateFlow<List<Staff>> = internalAvailableStaff.asStateFlow()

    internal val internalStaffAvailability = MutableStateFlow<Map<String, List<StaffAvailabilityAssignment>>>(emptyMap())
    val staffAvailability: StateFlow<Map<String, List<StaffAvailabilityAssignment>>> = internalStaffAvailability.asStateFlow()
    
    private var availabilityJob: Job? = null
    
    internal fun cancelAvailabilityJob() {
        availabilityJob?.cancel()
    }
    
    internal fun startAvailabilityJob(job: Job) {
        availabilityJob = job
    }

    internal val internalAvailableTeams = MutableStateFlow<List<StaffTeam>>(emptyList())
    val availableTeams: StateFlow<List<StaffTeam>> = internalAvailableTeams.asStateFlow()
    var isLoadingTeams by mutableStateOf(false)
        internal set
    var teamsErrorMessage by mutableStateOf<String?>(null)
        internal set

    // Step 6: Location & Details
    var location by mutableStateOf("")
    var city by mutableStateOf("")
    var notes by mutableStateOf("")

    // Financial fields
    var requiresInvoice by mutableStateOf(false)
    var taxRate by mutableStateOf("16.0")
    var depositPercent by mutableStateOf("50.0")
    var cancellationDays by mutableStateOf("7.0")
    var refundPercent by mutableStateOf("50.0")

    // Client History Stats
    var clientEventCount by mutableStateOf<Int?>(null)
    var clientTotalSpent by mutableStateOf<Double?>(null)

    fun onClientSelected(client: Client) {
        selectedClient = client
        clientEventCount = client.totalEvents
        clientTotalSpent = client.totalSpent
        if (location.isBlank() && !client.address.isNullOrBlank()) {
            location = client.address!!
        }
        if (city.isBlank() && !client.city.isNullOrBlank()) {
            city = client.city!!
        }
    }

    // Product Unit Costs (for profitability)
    internal val _productUnitCosts = mutableMapOf<String, Double>()
    val productUnitCosts: Map<String, Double> get() = _productUnitCosts.toMap()
    val hasPendingProductCosts: Boolean
        get() = selectedProducts
            .map { it.productId }
            .distinct()
            .any { _productUnitCosts[it] == null }

    fun retryLoadProducts() {
        loadProductsCatalog()
    }

    private fun loadProductsCatalog() {
        loadProductsJob?.cancel()
        loadProductsJob = viewModelScope.launch {
            productRepository.getProducts()
                .onStart {
                    isLoadingProducts = true
                    productLoadError = null
                }
                .catch {
                    _availableProducts.value = emptyList()
                    productLoadError = "No se pudo cargar el catálogo de productos."
                }
                .onCompletion {
                    isLoadingProducts = false
                }
                .collect {
                    _availableProducts.value = it
                }
        }
    }

    internal fun fetchProductCosts() {
        val missing = selectedProducts
            .filter { _productUnitCosts[it.productId] == null }
            .map { it.productId }
            .distinct()
        if (missing.isEmpty()) return
        viewModelScope.launch {
            missing.forEach { productId ->
                try {
                    val ingredients: List<ProductIngredient> = apiService.get(Endpoints.productIngredients(productId))
                    val cost = ingredients
                        .filter { it.type == InventoryType.INGREDIENT || it.type == InventoryType.SUPPLY }
                        .sumOf { (it.unitCost ?: 0.0) * it.quantityRequired }
                    _productUnitCosts[productId] = cost
                } catch (_: Exception) {
                    _productUnitCosts[productId] = 0.0
                }
            }
        }
    }

    var isLoading by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var saveError by mutableStateOf<String?>(null)
    var planLimitMessage by mutableStateOf<String?>(null)
    var dateUnavailableWarning by mutableStateOf<String?>(null)

    private val _unavailableDates = mutableStateListOf<UnavailableDate>()
    val unavailableDates: List<UnavailableDate> get() = _unavailableDates

    fun checkDateAvailability(date: LocalDate) {
        val dateStr = date.toString()
        val blocked = _unavailableDates.find { ud ->
            dateStr >= ud.startDate && dateStr <= ud.endDate
        }
        dateUnavailableWarning = if (blocked != null) {
            val reason = if (!blocked.reason.isNullOrBlank()) " (${blocked.reason})" else ""
            "Esta fecha está marcada como no disponible$reason"
        } else {
            null
        }
        fetchStaffAvailability()
    }

    private fun loadUnavailableDates() {
        viewModelScope.launch {
            try {
                val now = LocalDate.now()
                val start = now.minusMonths(1).toString()
                val end = now.plusMonths(12).toString()
                val dates: List<UnavailableDate> = apiService.get(
                    Endpoints.UNAVAILABLE_DATES,
                    mapOf("start" to start, "end" to end)
                )
                _unavailableDates.clear()
                _unavailableDates.addAll(dates)
                if (eventId == null) {
                    var candidate = eventDate
                    val maxTries = 365
                    var tries = 0
                    while (tries < maxTries && dates.any { ud ->
                        val candidateStr = candidate.toString()
                        candidateStr >= ud.startDate && candidateStr <= ud.endDate
                    }) {
                        candidate = candidate.plusDays(1)
                        tries++
                    }
                    eventDate = candidate
                }
                checkDateAvailability(eventDate)
            } catch (e: Exception) {
                // Ignore - non-critical feature
            }
        }
    }

    init {
        loadProductsCatalog()
        loadStaffCatalog()
        viewModelScope.launch {
            inventoryRepository.getInventoryItems().collect { items ->
                _availableEquipment.value = items.filter { it.type == InventoryType.EQUIPMENT }
                _availableSupplies.value = items.filter {
                    it.type == InventoryType.SUPPLY
                }
            }
        }
        if (eventId != null) {
            loadExistingEvent(eventId)
        } else {
            viewModelScope.launch {
                val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
                limitCheckResult = planLimitsManager.canCreateEvent(plan)
            }
            val dateParam = savedStateHandle.get<String>("date")
            if (dateParam != null && dateParam.isNotBlank()) {
                try {
                    eventDate = LocalDate.parse(dateParam)
                } catch (_: Exception) {
                    // Fall back to default LocalDate.now()
                }
            }
            if (!loadFromDuplicate()) {
                loadFromQuickQuote()
            }
        }
        loadUnavailableDates()
        fetchStaffAvailability()
    }

    private fun loadFromQuickQuote() {
        val data = QuickQuoteDataHolder.pendingData ?: return
        QuickQuoteDataHolder.pendingData = null

        data.products.forEach { transferProduct ->
            val eventProduct = EventProduct(
                id = UUID.randomUUID().toString(),
                eventId = "",
                productId = transferProduct.productId,
                quantity = transferProduct.quantity.toDouble(),
                unitPrice = transferProduct.unitPrice,
                discount = 0.0,
                totalPrice = transferProduct.unitPrice * transferProduct.quantity,
                createdAt = "",
                productName = transferProduct.productName
            )
            selectedProducts.add(eventProduct)
        }

        data.extras.forEach { transferExtra ->
            val extra = EventExtra(
                id = UUID.randomUUID().toString(),
                eventId = "",
                description = transferExtra.description,
                cost = transferExtra.cost,
                price = transferExtra.price,
                excludeUtility = transferExtra.excludeUtility,
                includeInChecklist = transferExtra.includeInChecklist,
                createdAt = ""
            )
            eventExtras.add(extra)
        }

        discountType = when (data.discountType) {
            "fixed" -> DiscountType.FIXED
            else -> DiscountType.PERCENT
        }
        discount = if (data.discountValue > 0) data.discountValue.toString() else "0"

        if (data.numPeople > 0) {
            numPeople = data.numPeople.toString()
        }

        requiresInvoice = data.requiresInvoice

        fetchProductCosts()
    }

    private fun loadFromDuplicate(): Boolean {
        val data = DuplicateEventDataHolder.pendingData ?: return false
        DuplicateEventDataHolder.pendingData = null

        val source = data.event

        eventDate = LocalDate.now()
        startTime = source.startTime ?: ""
        endTime = source.endTime ?: ""
        status = EventStatus.QUOTED
        serviceType = source.serviceType
        numPeople = source.numPeople.toString()
        location = source.location ?: ""
        city = source.city ?: ""
        notes = source.notes ?: ""

        viewModelScope.launch {
            val client = clientRepository.getClient(source.clientId)
            if (client != null) onClientSelected(client)
        }

        discount = source.discount.toString()
        discountType = source.discountType
        requiresInvoice = source.requiresInvoice
        taxRate = source.taxRate.toString()
        depositPercent = source.depositPercent?.toString() ?: "50.0"
        cancellationDays = source.cancellationDays?.toString() ?: "7.0"
        refundPercent = source.refundPercent?.toString() ?: "50.0"

        selectedProducts.clear()
        data.products.forEach { product ->
            selectedProducts.add(
                product.copy(
                    id = UUID.randomUUID().toString(),
                    eventId = "",
                    createdAt = ""
                )
            )
        }

        eventExtras.clear()
        data.extras.forEach { extra ->
            eventExtras.add(
                extra.copy(
                    id = UUID.randomUUID().toString(),
                    eventId = "",
                    createdAt = ""
                )
            )
        }

        selectedEquipment.clear()
        data.equipment.forEach { eq ->
            selectedEquipment.add(
                eq.copy(
                    id = UUID.randomUUID().toString(),
                    eventId = ""
                )
            )
        }

        selectedSupplies.clear()
        data.supplies.forEach { sup ->
            selectedSupplies.add(
                sup.copy(
                    id = UUID.randomUUID().toString(),
                    eventId = ""
                )
            )
        }

        fetchProductCosts()
        return true
    }

    private fun loadExistingEvent(id: String) {
        viewModelScope.launch {
            isLoadingEvent = true
            loadError = null
            try {
                val event = eventRepository.getEvent(id)
                    ?: throw IllegalStateException(
                        "El evento no existe o fue eliminado. Tirá abajo para actualizar " +
                            "desde el servidor."
                    )

                eventDate = try {
                    LocalDate.parse(event.eventDate)
                } catch (e: Exception) {
                    LocalDate.now()
                }
                startTime = event.startTime ?: ""
                endTime = event.endTime ?: ""
                status = event.status
                serviceType = event.serviceType
                numPeople = event.numPeople.toString()
                location = event.location ?: ""
                city = event.city ?: ""
                notes = event.notes ?: ""
                discount = event.discount.toString()
                discountType = event.discountType
                requiresInvoice = event.requiresInvoice
                taxRate = event.taxRate.toString()
                depositPercent = event.depositPercent?.toString() ?: "50.0"
                cancellationDays = event.cancellationDays?.toString() ?: "7.0"
                refundPercent = event.refundPercent?.toString() ?: "50.0"

                val client = clientRepository.getClient(event.clientId)
                selectedClient = client
                clientEventCount = client?.totalEvents
                clientTotalSpent = client?.totalSpent

                try {
                    eventRepository.syncEventItems(id)
                } catch (e: Exception) {
                    _uiEvents.tryEmit(
                        UiEvent.Error(
                            message = "No se pudo sincronizar con el servidor. " +
                                "Mostrando datos en caché.",
                            retryActionId = null,
                        )
                    )
                }

                val products = eventRepository.getEventProducts(id).first()
                selectedProducts.clear()
                selectedProducts.addAll(products)
                fetchProductCosts()

                val extras = eventRepository.getEventExtras(id).first()
                eventExtras.clear()
                eventExtras.addAll(extras)

                try {
                    val equipment: List<EventEquipment> =
                        apiService.get(Endpoints.eventEquipment(id))
                    selectedEquipment.clear()
                    selectedEquipment.addAll(equipment)
                } catch (e: Exception) {
                    _uiEvents.tryEmit(
                        UiEvent.Error(
                            message = "No se pudo cargar el equipamiento del evento.",
                            retryActionId = null,
                        )
                    )
                }

                try {
                    val supplies: List<EventSupply> =
                        apiService.get(Endpoints.eventSupplies(id))
                    selectedSupplies.clear()
                    selectedSupplies.addAll(supplies)
                } catch (e: Exception) {
                    _uiEvents.tryEmit(
                        UiEvent.Error(
                            message = "No se pudieron cargar los insumos del evento.",
                            retryActionId = null,
                        )
                    )
                }

                try {
                    val eventStaff = staffRepository.syncEventStaff(id)
                    selectedStaff.clear()
                    eventStaff.forEach { assignment ->
                        val normalizedStatus = AssignmentStatus.fromString(assignment.status).raw
                        selectedStaff.add(
                            SelectedStaffAssignment(
                                staffId = assignment.staffId,
                                feeAmount = assignment.feeAmount,
                                roleOverride = assignment.roleOverride ?: "",
                                notes = assignment.notes ?: "",
                                staffName = assignment.staffName,
                                staffRoleLabel = assignment.staffRoleLabel,
                                shiftStart = assignment.shiftStart,
                                shiftEnd = assignment.shiftEnd,
                                status = normalizedStatus
                            )
                        )
                    }
                } catch (e: Exception) {
                    _uiEvents.tryEmit(
                        UiEvent.Error(
                            message = "No se pudo cargar el personal asignado.",
                            retryActionId = null,
                        )
                    )
                }
            } catch (e: Exception) {
                loadError = e.message
                    ?: "No se pudo cargar el evento. Verificá tu conexión y reintentá."
            } finally {
                isLoadingEvent = false
            }
        }
    }

    fun retryLoad() {
        eventId?.let { loadExistingEvent(it) }
    }

    fun addProduct(product: Product, quantity: Double) {
        val existing = selectedProducts.find { it.productId == product.id }
        if (existing != null) {
            val index = selectedProducts.indexOf(existing)
            val newQty = existing.quantity + quantity
            selectedProducts[index] = existing.copy(
                quantity = newQty,
                totalPrice = newQty * (existing.unitPrice - existing.discount)
            )
        } else {
            val eventProduct = EventProduct(
                id = UUID.randomUUID().toString(),
                eventId = "",
                productId = product.id,
                quantity = quantity,
                unitPrice = product.basePrice,
                discount = 0.0,
                totalPrice = product.basePrice * quantity,
                createdAt = ""
            )
            selectedProducts.add(eventProduct)
        }
        fetchProductCosts()

        product.staffTeamId?.takeIf { it.isNotBlank() }?.let { teamId ->
            expandStaffTeamForProduct(teamId)
        }
    }

    fun removeProduct(productId: String) {
        selectedProducts.removeAll { it.productId == productId }
    }

    fun updateProductQuantity(productId: String, newQuantity: Double) {
        if (newQuantity <= 0) {
            removeProduct(productId)
            return
        }
        val existing = selectedProducts.find { it.productId == productId }
        if (existing != null) {
            val index = selectedProducts.indexOf(existing)
            selectedProducts[index] = existing.copy(
                quantity = newQuantity,
                totalPrice = newQuantity * (existing.unitPrice - existing.discount)
            )
        }
    }

    fun updateProductDiscount(productId: String, newDiscount: Double) {
        val existing = selectedProducts.find { it.productId == productId } ?: return
        val clampedDiscount = newDiscount.coerceIn(0.0, existing.unitPrice)
        val index = selectedProducts.indexOf(existing)
        selectedProducts[index] = existing.copy(
            discount = clampedDiscount,
            totalPrice = existing.quantity * (existing.unitPrice - clampedDiscount)
        )
    }

    fun moveProduct(fromIndex: Int, toIndex: Int) {
        if (fromIndex == toIndex || fromIndex !in selectedProducts.indices || toIndex !in selectedProducts.indices) return
        val item = selectedProducts.removeAt(fromIndex)
        selectedProducts.add(toIndex, item)
    }

    fun addExtra(description: String, cost: Double, price: Double, excludeUtility: Boolean, includeInChecklist: Boolean = true) {
        if (description.isBlank()) return
        val effectivePrice = if (excludeUtility) cost else price
        if (effectivePrice <= 0 && cost <= 0) return
        val extra = EventExtra(
            id = UUID.randomUUID().toString(),
            eventId = "",
            description = description,
            cost = cost,
            price = effectivePrice,
            excludeUtility = excludeUtility,
            includeInChecklist = includeInChecklist,
            createdAt = ""
        )
        eventExtras.add(extra)
    }

    fun updateExtra(id: String, cost: Double, price: Double, excludeUtility: Boolean, includeInChecklist: Boolean = true) {
        val existing = eventExtras.find { it.id == id } ?: return
        val index = eventExtras.indexOf(existing)
        val effectivePrice = if (excludeUtility) cost else price
        eventExtras[index] = existing.copy(
            cost = cost,
            price = effectivePrice,
            excludeUtility = excludeUtility,
            includeInChecklist = includeInChecklist
        )
    }

    fun addBlankExtra() {
        eventExtras.add(
            EventExtra(
                id = UUID.randomUUID().toString(),
                eventId = "",
                description = "",
                cost = 0.0,
                price = 0.0,
                excludeUtility = false,
                includeInChecklist = true,
                createdAt = "",
            )
        )
    }

    fun updateExtraFields(
        id: String,
        description: String? = null,
        cost: Double? = null,
        price: Double? = null,
        excludeUtility: Boolean? = null,
        includeInChecklist: Boolean? = null,
    ) {
        val existing = eventExtras.find { it.id == id } ?: return
        val index = eventExtras.indexOf(existing)
        val newExcludeUtility = excludeUtility ?: existing.excludeUtility
        val newCost = cost ?: existing.cost
        val newPrice = when {
            newExcludeUtility -> newCost
            price != null -> price
            else -> existing.price
        }
        eventExtras[index] = existing.copy(
            description = description ?: existing.description,
            cost = newCost,
            price = newPrice,
            excludeUtility = newExcludeUtility,
            includeInChecklist = includeInChecklist ?: existing.includeInChecklist,
        )
    }

    fun removeExtra(id: String) {
        eventExtras.removeAll { it.id == id }
    }

    fun moveExtra(fromIndex: Int, toIndex: Int) {
        if (fromIndex == toIndex || fromIndex !in eventExtras.indices || toIndex !in eventExtras.indices) return
        val item = eventExtras.removeAt(fromIndex)
        eventExtras.add(toIndex, item)
    }

    fun setProductQuantityToNumPeople(productId: String) {
        val qty = numPeople.toDoubleOrNull() ?: return
        if (qty <= 0) return
        updateProductQuantity(productId, qty)
    }

    fun validateStep(step: Int): String? = when (step) {
        0 -> when {
            selectedClient == null -> tr(R.string.events_form_validation_client_required)
            serviceType.isBlank() -> tr(R.string.events_form_validation_service_required)
            (numPeople.toIntOrNull() ?: 0) < 1 -> tr(R.string.events_form_validation_people_required)
            !EventFormTimeHelper.isValidTime24h(startTime) ->
                tr(R.string.events_form_validation_start_time_invalid)
            !EventFormTimeHelper.isValidTime24h(endTime) ->
                tr(R.string.events_form_validation_end_time_invalid)
            startTime.isNotBlank() && endTime.isNotBlank() &&
                EventFormTimeHelper.normalizeTime(startTime) == EventFormTimeHelper.normalizeTime(endTime) ->
                tr(R.string.events_form_validation_same_time)
            else -> null
        }
        else -> null
    }

    private fun normalizeStaffForSave(): Result<List<EventStaffAssignmentPayload>> {
        val normalized = mutableListOf<EventStaffAssignmentPayload>()
        selectedStaff.forEachIndexed { index, assignment ->
            val trimmedId = assignment.staffId.trim()
            if (trimmedId.isBlank()) {
                return Result.failure(IllegalArgumentException("Personal #${index + 1}: ID inválido"))
            }
            try {
                UUID.fromString(trimmedId)
            } catch (_: IllegalArgumentException) {
                return Result.failure(IllegalArgumentException("Personal #${index + 1}: ID inválido"))
            }
            val fee = assignment.feeAmount
            if (fee != null && fee < 0.0) {
                return Result.failure(IllegalArgumentException("Personal #${index + 1}: El pago no puede ser negativo"))
            }

            val normalizedStatus = assignment.status?.let { raw ->
                AssignmentStatus.fromString(raw).raw
            }

            normalized.add(
                EventStaffAssignmentPayload(
                    staffId = trimmedId,
                    feeAmount = fee,
                    roleOverride = assignment.roleOverride.takeIf { s -> s.isNotBlank() },
                    notes = assignment.notes.takeIf { s -> s.isNotBlank() },
                    shiftStart = assignment.shiftStart,
                    shiftEnd = assignment.shiftEnd,
                    status = normalizedStatus,
                )
            )
        }
        return Result.success(normalized)
    }

    fun saveEvent() {
        val client = selectedClient ?: run {
            saveError = tr(R.string.events_form_validation_client_required_short)
            return
        }
        if ((numPeople.toIntOrNull() ?: 0) < 1) {
            saveError = tr(R.string.events_form_validation_people_min)
            return
        }
        if (serviceType.isBlank()) {
            saveError = tr(R.string.events_form_validation_service_add)
            return
        }
        if (!EventFormTimeHelper.isValidTime24h(startTime)) {
            saveError = tr(R.string.events_form_validation_start_time_invalid)
            return
        }
        if (!EventFormTimeHelper.isValidTime24h(endTime)) {
            saveError = tr(R.string.events_form_validation_end_time_invalid)
            return
        }
        if (
            startTime.isNotBlank() && endTime.isNotBlank() &&
            EventFormTimeHelper.normalizeTime(startTime) == EventFormTimeHelper.normalizeTime(endTime)
        ) {
            saveError = tr(R.string.events_form_validation_same_time)
            return
        }
        viewModelScope.launch {
            isLoading = true
            saveError = null
            try {
                val eventData = Event(
                    id = eventId ?: UUID.randomUUID().toString(),
                    userId = "", // Handled by backend
                    clientId = client.id,
                    eventDate = eventDate.toString(),
                    startTime = startTime.ifBlank { null },
                    endTime = endTime.ifBlank { null },
                    serviceType = serviceType,
                    numPeople = numPeople.toIntOrNull() ?: 0,
                    status = status,
                    discount = discount.toDoubleOrNull() ?: 0.0,
                    discountType = discountType,
                    requiresInvoice = requiresInvoice,
                    taxRate = taxRate.toDoubleOrNull() ?: 0.0,
                    taxAmount = taxAmount,
                    totalAmount = total,
                    location = location,
                    city = city,
                    depositPercent = depositPercent.toDoubleOrNull(),
                    cancellationDays = cancellationDays.toDoubleOrNull(),
                    refundPercent = refundPercent.toDoubleOrNull(),
                    notes = notes.ifBlank { null }
                )

                val savedEvent = if (isEditMode) {
                    eventRepository.updateEvent(eventData)
                } else {
                    eventRepository.createEvent(eventData)
                }

                val normalizedStaff = normalizeStaffForSave().getOrElse { err ->
                    throw err
                }

                eventRepository.updateItems(
                    eventId = savedEvent.id,
                    products = selectedProducts.toList(),
                    extras = eventExtras.filter { it.description.isNotBlank() }.toList(),
                    equipment = selectedEquipment.toList(),
                    supplies = selectedSupplies.toList(),
                    staff = normalizedStaff
                )

                saveSuccess = true
            } catch (e: SolennixException.PlanLimitExceeded) {
                planLimitMessage = e.message
            } catch (e: Exception) {
                saveError = e.message ?: "Error al guardar evento"
            } finally {
                isLoading = false
            }
        }
    }

    val isDirty: Boolean
        get() = selectedClient != null ||
                selectedProducts.isNotEmpty() ||
                eventExtras.isNotEmpty() ||
                selectedEquipment.isNotEmpty() ||
                selectedSupplies.isNotEmpty() ||
                selectedStaff.isNotEmpty() ||
                serviceType.isNotBlank() ||
                location.isNotBlank() ||
                city.isNotBlank() ||
                notes.isNotBlank()
}

/**
 * Shape de una asignación de Staff mientras el evento se está editando en
 * memoria. El `staffName` / `staffRoleLabel` son snapshots cacheados para
 * pintar la lista sin hacer lookup al catálogo cada vez que se re-renderiza.
 */
data class SelectedStaffAssignment(
    val staffId: String,
    val feeAmount: Double?,
    val roleOverride: String,
    val notes: String,
    val staffName: String?,
    val staffRoleLabel: String?,
    // Ola 1 — shift times en ISO8601 UTC. Null = sin turno registrado.
    val shiftStart: String? = null,
    val shiftEnd: String? = null,
    val status: String? = null
)

