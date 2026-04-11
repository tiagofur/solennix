package com.creapolis.solennix.feature.events.viewmodel

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
import com.creapolis.solennix.core.designsystem.event.UiEvent
import com.creapolis.solennix.core.model.*
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class EventFormViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val clientRepository: ClientRepository,
    private val productRepository: ProductRepository,
    private val inventoryRepository: InventoryRepository,
    private val apiService: ApiService,
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: String? = savedStateHandle.get<String>("eventId")?.takeIf { it.isNotBlank() }
    val isEditMode: Boolean = eventId != null

    // Plan limit check
    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set
    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached

    var isLoadingEvent by mutableStateOf(false)

    /**
     * Non-null when the primary event load failed and the form is in an unusable state.
     * The screen should render an error card with a "Reintentar" button instead of the
     * form fields when this is set.
     */
    var loadError by mutableStateOf<String?>(null)
        private set

    private val _uiEvents = MutableSharedFlow<UiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<UiEvent> = _uiEvents.asSharedFlow()

    // Step 1: General Info
    var selectedClient by mutableStateOf<Client?>(null)
    var eventDate by mutableStateOf(LocalDate.now())
    var startTime by mutableStateOf("14:00")
    var endTime by mutableStateOf("20:00")
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
            quickClientError = "El nombre es requerido"
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
                quickClientError = "Error al crear cliente: ${e.message}"
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
    private val _equipmentConflicts = MutableStateFlow<List<EquipmentConflict>>(emptyList())
    val equipmentConflicts: StateFlow<List<EquipmentConflict>> = _equipmentConflicts.asStateFlow()
    private val _equipmentSuggestions = MutableStateFlow<List<EquipmentSuggestion>>(emptyList())
    val equipmentSuggestions: StateFlow<List<EquipmentSuggestion>> = _equipmentSuggestions.asStateFlow()
    private val _availableEquipment = MutableStateFlow<List<InventoryItem>>(emptyList())
    val availableEquipment: StateFlow<List<InventoryItem>> = _availableEquipment.asStateFlow()
    var isCheckingConflicts by mutableStateOf(false)

    // Step 5: Supplies
    val selectedSupplies = mutableStateListOf<EventSupply>()
    private val _supplySuggestions = MutableStateFlow<List<SupplySuggestion>>(emptyList())
    val supplySuggestions: StateFlow<List<SupplySuggestion>> = _supplySuggestions.asStateFlow()
    private val _availableSupplies = MutableStateFlow<List<InventoryItem>>(emptyList())
    val availableSupplies: StateFlow<List<InventoryItem>> = _availableSupplies.asStateFlow()

    // Step 6: Location & Details (moved to GeneralInfo in UI)
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
        // Auto-fill location/city from client if event fields are empty
        if (location.isBlank() && !client.address.isNullOrBlank()) {
            location = client.address!!
        }
        if (city.isBlank() && !client.city.isNullOrBlank()) {
            city = client.city!!
        }
    }

    // Product Unit Costs (for profitability)
    private val _productUnitCosts = mutableMapOf<String, Double>()
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

    private fun fetchProductCosts() {
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

    // Summary Logic
    val subtotalProducts: Double get() = selectedProducts.sumOf { it.totalPrice ?: 0.0 }
    val subtotalExtras: Double get() = eventExtras.sumOf { it.price }
    val subtotalNormalExtras: Double get() = eventExtras.filter { !it.excludeUtility }.sumOf { it.price }
    val subtotalPassThroughExtras: Double get() = eventExtras.filter { it.excludeUtility }.sumOf { it.price }
    val discountableBase: Double get() = subtotalProducts + subtotalNormalExtras
    val discountAmount: Double get() {
        val d = discount.toDoubleOrNull() ?: 0.0
        return if (discountType == DiscountType.PERCENT) {
            discountableBase * (d / 100)
        } else {
            d.coerceAtMost(discountableBase)
        }
    }
    val taxAmount: Double get() {
        if (!requiresInvoice) return 0.0
        val rate = taxRate.toDoubleOrNull() ?: 0.0
        val baseTotal = discountableBase - discountAmount + subtotalPassThroughExtras
        return baseTotal * (rate / 100)
    }
    val total: Double get() {
        return (discountableBase - discountAmount + subtotalPassThroughExtras + taxAmount).coerceAtLeast(0.0)
    }

    // Profitability Metrics
    val costProducts: Double get() = selectedProducts.sumOf { p ->
        (_productUnitCosts[p.productId] ?: 0.0) * p.quantity
    }
    val costExtras: Double get() = eventExtras.sumOf { it.cost }
    val costSupplies: Double get() = selectedSupplies.filter { !it.excludeCost }.sumOf { it.unitCost * it.quantity }
    val totalCosts: Double get() = costProducts + costExtras + costSupplies
    val netProfit: Double get() {
        val revenue = total - (if (requiresInvoice) taxAmount else 0.0)
        return revenue - totalCosts
    }
    val profitMargin: Double get() {
        val revenue = total - (if (requiresInvoice) taxAmount else 0.0)
        val passThroughRevenue = eventExtras.filter { it.excludeUtility }.sumOf { it.price }
        val adjustedRevenue = revenue - passThroughRevenue
        if (adjustedRevenue <= 0) return 0.0
        return (netProfit / adjustedRevenue) * 100
    }

    var isLoading by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var saveError by mutableStateOf<String?>(null)
    var dateUnavailableWarning by mutableStateOf<String?>(null)

    private var _unavailableDates = mutableStateListOf<UnavailableDate>()

    fun checkDateAvailability(date: LocalDate) {
        val dateStr = date.toString()
        val blocked = _unavailableDates.find { ud ->
            dateStr >= ud.startDate && dateStr <= ud.endDate
        }
        dateUnavailableWarning = if (blocked != null) {
            val reason = if (!blocked.reason.isNullOrBlank()) " (${blocked.reason})" else ""
            "Esta fecha esta marcada como no disponible$reason"
        } else {
            null
        }
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
                // Check current date on load
                checkDateAvailability(eventDate)
            } catch (e: Exception) {
                // Ignore - non-critical feature
            }
        }
    }

    init {
        loadProductsCatalog()
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
            // Only check plan limits when creating a new event
            viewModelScope.launch {
                val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
                limitCheckResult = planLimitsManager.canCreateEvent(plan)
            }
            // Load data from QuickQuote if available
            loadFromQuickQuote()
        }
        loadUnavailableDates()
    }

    private fun loadFromQuickQuote() {
        val data = QuickQuoteDataHolder.pendingData ?: return
        QuickQuoteDataHolder.pendingData = null

        // Map products
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

        // Map extras
        data.extras.forEach { transferExtra ->
            val extra = EventExtra(
                id = UUID.randomUUID().toString(),
                eventId = "",
                description = transferExtra.description,
                cost = transferExtra.cost,
                price = transferExtra.price,
                excludeUtility = transferExtra.excludeUtility,
                createdAt = ""
            )
            eventExtras.add(extra)
        }

        // Set discount
        discountType = when (data.discountType) {
            "fixed" -> DiscountType.FIXED
            else -> DiscountType.PERCENT
        }
        discount = if (data.discountValue > 0) data.discountValue.toString() else "0"

        // Set num people
        if (data.numPeople > 0) {
            numPeople = data.numPeople.toString()
        }

        // Set invoice
        requiresInvoice = data.requiresInvoice

        fetchProductCosts()
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

                // Populate general info
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

                // Load client — non-fatal if the client record is stale
                val client = clientRepository.getClient(event.clientId)
                selectedClient = client
                clientEventCount = client?.totalEvents
                clientTotalSpent = client?.totalSpent

                // Sync event items from server — non-fatal, cache is authoritative for UI
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

                // Load products (primary)
                val products = eventRepository.getEventProducts(id).first()
                selectedProducts.clear()
                selectedProducts.addAll(products)
                fetchProductCosts()

                // Load extras (primary)
                val extras = eventRepository.getEventExtras(id).first()
                eventExtras.clear()
                eventExtras.addAll(extras)

                // Load equipment — non-fatal, renders empty section with an advisory
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

                // Load supplies — non-fatal
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
            } catch (e: Exception) {
                // Primary load failed — the form is unusable. Set error state so the UI
                // can render a retry card instead of an empty form pretending everything
                // is fine.
                loadError = e.message
                    ?: "No se pudo cargar el evento. Verificá tu conexión y reintentá."
            } finally {
                isLoadingEvent = false
            }
        }
    }

    /** Retry loading the current event after a failure. */
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

    fun addExtra(description: String, cost: Double, price: Double, excludeUtility: Boolean) {
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
            createdAt = ""
        )
        eventExtras.add(extra)
    }

    fun updateExtra(id: String, cost: Double, price: Double, excludeUtility: Boolean) {
        val existing = eventExtras.find { it.id == id } ?: return
        val index = eventExtras.indexOf(existing)
        val effectivePrice = if (excludeUtility) cost else price
        eventExtras[index] = existing.copy(
            cost = cost,
            price = effectivePrice,
            excludeUtility = excludeUtility
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

    // Equipment Methods
    fun addEquipment(item: InventoryItem, quantity: Int) {
        val existing = selectedEquipment.find { it.inventoryId == item.id }
        if (existing != null) {
            val index = selectedEquipment.indexOf(existing)
            selectedEquipment[index] = existing.copy(quantity = existing.quantity + quantity)
        } else {
            val equipment = EventEquipment(
                id = UUID.randomUUID().toString(),
                eventId = "",
                inventoryId = item.id,
                quantity = quantity,
                createdAt = "",
                equipmentName = item.ingredientName,
                unit = item.unit,
                currentStock = item.currentStock
            )
            selectedEquipment.add(equipment)
        }
        checkEquipmentConflicts()
    }

    fun removeEquipment(inventoryId: String) {
        selectedEquipment.removeAll { it.inventoryId == inventoryId }
        checkEquipmentConflicts()
    }

    fun updateEquipmentQuantity(inventoryId: String, newQuantity: Int) {
        if (newQuantity <= 0) {
            removeEquipment(inventoryId)
            return
        }
        val existing = selectedEquipment.find { it.inventoryId == inventoryId }
        if (existing != null) {
            val index = selectedEquipment.indexOf(existing)
            selectedEquipment[index] = existing.copy(quantity = newQuantity)
        }
        checkEquipmentConflicts()
    }

    fun checkEquipmentConflicts() {
        if (selectedEquipment.isEmpty()) {
            _equipmentConflicts.value = emptyList()
            return
        }
        viewModelScope.launch {
            isCheckingConflicts = true
            try {
                val conflicts = eventRepository.getEquipmentConflicts(
                    eventDate = eventDate.toString(),
                    equipmentIds = selectedEquipment.map { it.inventoryId }
                )
                _equipmentConflicts.value = conflicts
            } catch (e: Exception) {
                _equipmentConflicts.value = emptyList()
            } finally {
                isCheckingConflicts = false
            }
        }
    }

    fun fetchEquipmentSuggestions() {
        if (selectedProducts.isEmpty()) {
            _equipmentSuggestions.value = emptyList()
            return
        }
        viewModelScope.launch {
            try {
                val suggestions = eventRepository.getEquipmentSuggestions(
                    productIds = selectedProducts.map { it.productId }
                )
                _equipmentSuggestions.value = suggestions
            } catch (e: Exception) {
                _equipmentSuggestions.value = emptyList()
            }
        }
    }

    fun addEquipmentFromSuggestion(suggestion: EquipmentSuggestion) {
        val existing = selectedEquipment.find { it.inventoryId == suggestion.id }
        if (existing == null) {
            val equipment = EventEquipment(
                id = UUID.randomUUID().toString(),
                eventId = "",
                inventoryId = suggestion.id,
                quantity = suggestion.suggestedQuantity.toInt().coerceAtLeast(1),
                createdAt = "",
                equipmentName = suggestion.ingredientName,
                unit = suggestion.unit,
                currentStock = suggestion.currentStock
            )
            selectedEquipment.add(equipment)
            checkEquipmentConflicts()
        }
    }

    // Supplies Methods
    fun addSupply(item: InventoryItem, quantity: Double, source: SupplySource = SupplySource.STOCK) {
        val existing = selectedSupplies.find { it.inventoryId == item.id }
        if (existing != null) {
            val index = selectedSupplies.indexOf(existing)
            selectedSupplies[index] = existing.copy(quantity = existing.quantity + quantity)
        } else {
            val supply = EventSupply(
                id = UUID.randomUUID().toString(),
                eventId = "",
                inventoryId = item.id,
                quantity = quantity,
                unitCost = item.unitCost ?: 0.0,
                source = source,
                createdAt = "",
                supplyName = item.ingredientName,
                unit = item.unit,
                currentStock = item.currentStock
            )
            selectedSupplies.add(supply)
        }
    }

    fun removeSupply(inventoryId: String) {
        selectedSupplies.removeAll { it.inventoryId == inventoryId }
    }

    fun updateSupplyQuantity(inventoryId: String, newQuantity: Double) {
        if (newQuantity <= 0) {
            removeSupply(inventoryId)
            return
        }
        val existing = selectedSupplies.find { it.inventoryId == inventoryId }
        if (existing != null) {
            val index = selectedSupplies.indexOf(existing)
            selectedSupplies[index] = existing.copy(quantity = newQuantity)
        }
    }

    fun updateSupplySource(inventoryId: String, source: SupplySource) {
        val existing = selectedSupplies.find { it.inventoryId == inventoryId }
        if (existing != null) {
            val index = selectedSupplies.indexOf(existing)
            selectedSupplies[index] = existing.copy(source = source)
        }
    }

    fun updateSupplyExcludeCost(inventoryId: String, excludeCost: Boolean) {
        val existing = selectedSupplies.find { it.inventoryId == inventoryId }
        if (existing != null) {
            val index = selectedSupplies.indexOf(existing)
            selectedSupplies[index] = existing.copy(excludeCost = excludeCost)
        }
    }

    fun fetchSupplySuggestions() {
        if (selectedProducts.isEmpty()) {
            _supplySuggestions.value = emptyList()
            return
        }
        viewModelScope.launch {
            try {
                val suggestions = eventRepository.getSupplySuggestions(
                    productIds = selectedProducts.map { it.productId },
                    numPeople = numPeople.toIntOrNull() ?: 0
                )
                _supplySuggestions.value = suggestions
            } catch (e: Exception) {
                _supplySuggestions.value = emptyList()
            }
        }
    }

    fun addSupplyFromSuggestion(suggestion: SupplySuggestion) {
        val existing = selectedSupplies.find { it.inventoryId == suggestion.id }
        if (existing == null) {
            val source = if (suggestion.currentStock >= suggestion.suggestedQuantity) {
                SupplySource.STOCK
            } else {
                SupplySource.PURCHASE
            }
            val supply = EventSupply(
                id = UUID.randomUUID().toString(),
                eventId = "",
                inventoryId = suggestion.id,
                quantity = suggestion.suggestedQuantity,
                unitCost = suggestion.unitCost,
                source = source,
                createdAt = "",
                supplyName = suggestion.ingredientName,
                unit = suggestion.unit,
                currentStock = suggestion.currentStock
            )
            selectedSupplies.add(supply)
        }
    }

    fun validateStep(step: Int): String? = when (step) {
        0 -> when {
            selectedClient == null -> "Seleccioná un cliente"
            serviceType.isBlank() -> "Ingresá el tipo de servicio"
            (numPeople.toIntOrNull() ?: 0) < 1 -> "Ingresá la cantidad de personas"
            !isValidTime24h(startTime) ->
                "Hora de inicio inválida — usá formato HH:mm (ej: 14:30)"
            !isValidTime24h(endTime) ->
                "Hora de fin inválida — usá formato HH:mm (ej: 20:00)"
            startTime.isNotBlank() && endTime.isNotBlank() &&
                normalizeTime(startTime) == normalizeTime(endTime) ->
                "La hora de inicio y de fin no pueden ser iguales"
            else -> null
        }
        else -> null
    }

    /**
     * Accepts a blank string (maps to null in the backend) or a 24h time in HH:mm /
     * HH:mm:ss format. Uses [java.time.LocalTime.parse] which rejects out-of-range
     * values like "25:00" or "12:61".
     *
     * Domain note: we intentionally DO NOT enforce `endTime > startTime` because LATAM
     * events (weddings, quinceañeras) regularly run past midnight — a start of 20:00 and
     * an end of 02:00 is valid and means "next day". Only equality is rejected (that's
     * a zero-duration bug).
     */
    private fun isValidTime24h(s: String): Boolean {
        if (s.isBlank()) return true
        return try {
            java.time.LocalTime.parse(s)
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Normalizes "14:30" and "14:30:00" to the same canonical form for comparison. */
    private fun normalizeTime(s: String): String? = try {
        java.time.LocalTime.parse(s).toString()
    } catch (e: Exception) {
        null
    }

    fun saveEvent() {
        val client = selectedClient ?: run {
            saveError = "Selecciona un cliente"
            return
        }
        if ((numPeople.toIntOrNull() ?: 0) < 1) {
            saveError = "Mínimo 1 persona"
            return
        }
        if (serviceType.isBlank()) {
            saveError = "Agrega el tipo de servicio"
            return
        }
        // Final time validation — defensive, in case the user skipped step 0 validation.
        if (!isValidTime24h(startTime)) {
            saveError = "Hora de inicio inválida — usá formato HH:mm (ej: 14:30)"
            return
        }
        if (!isValidTime24h(endTime)) {
            saveError = "Hora de fin inválida — usá formato HH:mm (ej: 20:00)"
            return
        }
        if (
            startTime.isNotBlank() && endTime.isNotBlank() &&
            normalizeTime(startTime) == normalizeTime(endTime)
        ) {
            saveError = "La hora de inicio y de fin no pueden ser iguales"
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

                // Save all items (products, extras, equipment, supplies) in one request
                eventRepository.updateItems(
                    eventId = savedEvent.id,
                    products = selectedProducts.toList(),
                    extras = eventExtras.toList(),
                    equipment = selectedEquipment.toList(),
                    supplies = selectedSupplies.toList()
                )

                saveSuccess = true
            } catch (e: Exception) {
                saveError = e.message ?: "Error al guardar evento"
            } finally {
                isLoading = false
            }
        }
    }
}
