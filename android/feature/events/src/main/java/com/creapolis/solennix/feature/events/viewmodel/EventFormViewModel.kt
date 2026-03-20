package com.creapolis.solennix.feature.events.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.*
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
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
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: String? = savedStateHandle.get<String>("eventId")?.takeIf { it.isNotBlank() }
    val isEditMode: Boolean = eventId != null

    var isLoadingEvent by mutableStateOf(false)

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
    val subtotal: Double get() = subtotalProducts + subtotalExtras
    val discountAmount: Double get() {
        val d = discount.toDoubleOrNull() ?: 0.0
        return if (discountType == DiscountType.PERCENT) {
            subtotal * (d / 100)
        } else {
            d
        }
    }
    val taxAmount: Double get() {
        if (!requiresInvoice) return 0.0
        val rate = taxRate.toDoubleOrNull() ?: 0.0
        return (subtotal - discountAmount) * (rate / 100)
    }
    val total: Double get() {
        return (subtotal - discountAmount + taxAmount).coerceAtLeast(0.0)
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
        viewModelScope.launch {
            productRepository.getProducts().collect {
                _availableProducts.value = it
            }
        }
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
        }
        loadUnavailableDates()
    }

    private fun loadExistingEvent(id: String) {
        viewModelScope.launch {
            isLoadingEvent = true
            try {
                val event = eventRepository.getEvent(id)
                if (event != null) {
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

                    // Load client
                    val client = clientRepository.getClient(event.clientId)
                    selectedClient = client
                    clientEventCount = client?.totalEvents
                    clientTotalSpent = client?.totalSpent

                    // Load products
                    try {
                        eventRepository.syncEventItems(id)
                    } catch (_: Exception) { }
                    val products = eventRepository.getEventProducts(id).first()
                    selectedProducts.clear()
                    selectedProducts.addAll(products)
                    fetchProductCosts()

                    // Load extras
                    val extras = eventRepository.getEventExtras(id).first()
                    eventExtras.clear()
                    eventExtras.addAll(extras)

                    // Load equipment
                    try {
                        val equipment: List<EventEquipment> = apiService.get(Endpoints.eventEquipment(id))
                        selectedEquipment.clear()
                        selectedEquipment.addAll(equipment)
                    } catch (_: Exception) { }

                    // Load supplies
                    try {
                        val supplies: List<EventSupply> = apiService.get(Endpoints.eventSupplies(id))
                        selectedSupplies.clear()
                        selectedSupplies.addAll(supplies)
                    } catch (_: Exception) { }
                }
            } catch (e: Exception) {
                // Error loading event data — form stays in default state
            } finally {
                isLoadingEvent = false
            }
        }
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

    fun setProductQuantityToNumPeople(productId: String) {
        val qty = numPeople.toDoubleOrNull() ?: return
        if (qty <= 0) return
        updateProductQuantity(productId, qty)
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
                    notes = notes.ifBlank { null },
                    createdAt = "",
                    updatedAt = ""
                )

                val savedEvent = if (isEditMode) {
                    eventRepository.updateEvent(eventData)
                } else {
                    eventRepository.createEvent(eventData)
                }

                // Save products and extras for the event
                eventRepository.updateItems(
                    eventId = savedEvent.id,
                    products = selectedProducts.toList(),
                    extras = eventExtras.toList()
                )

                // Save equipment for the event
                eventRepository.updateEventEquipment(
                    eventId = savedEvent.id,
                    equipment = selectedEquipment.toList()
                )

                // Save supplies for the event
                eventRepository.updateEventSupplies(
                    eventId = savedEvent.id,
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
