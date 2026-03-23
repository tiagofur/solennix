package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventEquipment
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventPhoto
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.EquipmentConflict
import com.creapolis.solennix.core.model.EquipmentSuggestion
import com.creapolis.solennix.core.model.SupplySuggestion
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

interface EventRepository {
    fun getEvents(): Flow<List<Event>>
    fun getUpcomingEvents(limit: Int = 5): Flow<List<Event>>
    suspend fun getEvent(id: String): Event?
    suspend fun syncEvents()
    suspend fun createEvent(event: Event): Event
    suspend fun updateEvent(event: Event): Event
    suspend fun deleteEvent(id: String)
    suspend fun updateItems(eventId: String, products: List<EventProduct>, extras: List<EventExtra>)
    fun getEventProducts(eventId: String): Flow<List<EventProduct>>
    fun getEventExtras(eventId: String): Flow<List<EventExtra>>
    suspend fun syncEventItems(eventId: String)

    // Direct API access (bypasses Room cache)
    suspend fun getEventsFromApi(): List<Event>
    suspend fun getEventProductsFromApi(eventId: String): List<EventProduct>

    // Equipment and Supplies
    suspend fun getEquipmentConflicts(
        eventDate: String,
        equipmentIds: List<String>,
        excludeEventId: String? = null
    ): List<EquipmentConflict>

    suspend fun getEquipmentSuggestions(
        productIds: List<String>
    ): List<EquipmentSuggestion>

    suspend fun getSupplySuggestions(
        productIds: List<String>,
        numPeople: Int
    ): List<SupplySuggestion>

    suspend fun updateEventEquipment(eventId: String, equipment: List<EventEquipment>)
    suspend fun updateEventSupplies(eventId: String, supplies: List<EventSupply>)

    // Photos
    suspend fun getEventPhotos(eventId: String): List<EventPhoto>
    suspend fun uploadEventPhoto(eventId: String, imageUrl: String, caption: String? = null): EventPhoto
    suspend fun deleteEventPhoto(eventId: String, photoId: String)
}

@Singleton
class OfflineFirstEventRepository @Inject constructor(
    private val eventDao: EventDao,
    private val eventItemDao: EventItemDao,
    private val apiService: ApiService
) : EventRepository {

    override fun getEvents(): Flow<List<Event>> =
        eventDao.getEvents().map { it.map { entity -> entity.asExternalModel() } }

    override fun getUpcomingEvents(limit: Int): Flow<List<Event>> =
        eventDao.getUpcomingEvents(limit).map { it.map { entity -> entity.asExternalModel() } }

    override suspend fun getEvent(id: String): Event? =
        eventDao.getEvent(id)?.asExternalModel()

    override suspend fun syncEvents() {
        val networkEvents: List<Event> = apiService.get(Endpoints.EVENTS)
        eventDao.insertEvents(networkEvents.map { it.asEntity() })
    }

    override suspend fun createEvent(event: Event): Event {
        val networkEvent: Event = apiService.post(Endpoints.EVENTS, event)
        eventDao.insertEvents(listOf(networkEvent.asEntity()))
        return networkEvent
    }

    override suspend fun updateEvent(event: Event): Event {
        val networkEvent: Event = apiService.put(Endpoints.event(event.id), event)
        eventDao.insertEvents(listOf(networkEvent.asEntity()))
        return networkEvent
    }

    override suspend fun deleteEvent(id: String) {
        apiService.delete(Endpoints.event(id))
        val cached = eventDao.getEvent(id)
        if (cached != null) {
            eventDao.deleteEvent(cached)
        }
    }

    override suspend fun updateItems(eventId: String, products: List<EventProduct>, extras: List<EventExtra>) {
        val payload = UpdateItemsPayload(
            products = products.map {
                ProductItemPayload(
                    productId = it.productId,
                    quantity = it.quantity,
                    unitPrice = it.unitPrice,
                    discount = it.discount
                )
            },
            extras = extras.map {
                ExtraItemPayload(
                    description = it.description,
                    cost = it.cost,
                    price = it.price,
                    excludeUtility = it.excludeUtility
                )
            }
        )
        apiService.put<Any>(Endpoints.eventItems(eventId), payload)
        // Optionally sync immediately
        syncEventItems(eventId)
    }

    override fun getEventProducts(eventId: String): Flow<List<EventProduct>> =
        eventItemDao.getProductsByEventId(eventId).map { it.map { it.asExternalModel() } }

    override fun getEventExtras(eventId: String): Flow<List<EventExtra>> =
        eventItemDao.getExtrasByEventId(eventId).map { it.map { it.asExternalModel() } }

    override suspend fun syncEventItems(eventId: String) {
        val response: EventItemsResponse = apiService.get(Endpoints.eventItems(eventId))
        eventItemDao.deleteProductsByEventId(eventId)
        eventItemDao.deleteExtrasByEventId(eventId)
        eventItemDao.insertProducts(response.products.map { it.asEntity() })
        eventItemDao.insertExtras(response.extras.map { it.asEntity() })
    }

    override suspend fun getEventsFromApi(): List<Event> =
        apiService.get(Endpoints.EVENTS)

    override suspend fun getEventProductsFromApi(eventId: String): List<EventProduct> =
        apiService.get(Endpoints.eventProducts(eventId))

    override suspend fun getEquipmentConflicts(
        eventDate: String,
        equipmentIds: List<String>,
        excludeEventId: String?
    ): List<EquipmentConflict> {
        if (equipmentIds.isEmpty()) return emptyList()
        val params = buildMap {
            put("event_date", eventDate)
            put("equipment_ids", equipmentIds.joinToString(","))
            excludeEventId?.let { put("exclude_event_id", it) }
        }
        return apiService.get(Endpoints.EQUIPMENT_CONFLICTS, params)
    }

    override suspend fun getEquipmentSuggestions(
        productIds: List<String>
    ): List<EquipmentSuggestion> {
        if (productIds.isEmpty()) return emptyList()
        val params = mapOf("product_ids" to productIds.joinToString(","))
        return apiService.get(Endpoints.EQUIPMENT_SUGGESTIONS, params)
    }

    override suspend fun getSupplySuggestions(
        productIds: List<String>,
        numPeople: Int
    ): List<SupplySuggestion> {
        if (productIds.isEmpty()) return emptyList()
        val params = mapOf(
            "product_ids" to productIds.joinToString(","),
            "num_people" to numPeople.toString()
        )
        return apiService.get(Endpoints.SUPPLY_SUGGESTIONS, params)
    }

    override suspend fun updateEventEquipment(eventId: String, equipment: List<EventEquipment>) {
        val payload = EquipmentListPayload(
            equipment = equipment.map {
                EquipmentItemPayload(
                    inventoryId = it.inventoryId,
                    quantity = it.quantity,
                    notes = it.notes
                )
            }
        )
        apiService.put<Any>(Endpoints.eventEquipment(eventId), payload)
    }

    override suspend fun updateEventSupplies(eventId: String, supplies: List<EventSupply>) {
        val payload = SupplyListPayload(
            supplies = supplies.map {
                SupplyItemPayload(
                    inventoryId = it.inventoryId,
                    quantity = it.quantity,
                    unitCost = it.unitCost,
                    source = it.source.name.lowercase(),
                    excludeCost = it.excludeCost
                )
            }
        )
        apiService.put<Any>(Endpoints.eventSupplies(eventId), payload)
    }

    override suspend fun getEventPhotos(eventId: String): List<EventPhoto> {
        return apiService.get(Endpoints.eventPhotos(eventId))
    }

    override suspend fun uploadEventPhoto(eventId: String, imageUrl: String, caption: String?): EventPhoto {
        val payload = PhotoPayload(
            url = imageUrl,
            caption = caption
        )
        return apiService.post(Endpoints.eventPhotos(eventId), payload)
    }

    override suspend fun deleteEventPhoto(eventId: String, photoId: String) {
        apiService.delete(Endpoints.eventPhoto(eventId, photoId))
    }
}

@Serializable
data class EventItemsResponse(
    val products: List<EventProduct>,
    val extras: List<EventExtra>
)

@Serializable
data class UpdateItemsPayload(
    val products: List<ProductItemPayload>,
    val extras: List<ExtraItemPayload>
)

@Serializable
data class ProductItemPayload(
    @SerialName("product_id") val productId: String,
    val quantity: Double,
    @SerialName("unit_price") val unitPrice: Double,
    val discount: Double
)

@Serializable
data class ExtraItemPayload(
    val description: String,
    val cost: Double,
    val price: Double,
    @SerialName("exclude_utility") val excludeUtility: Boolean
)

@Serializable
data class EquipmentListPayload(
    val equipment: List<EquipmentItemPayload>
)

@Serializable
data class EquipmentItemPayload(
    @SerialName("inventory_id") val inventoryId: String,
    val quantity: Int,
    val notes: String? = null
)

@Serializable
data class SupplyListPayload(
    val supplies: List<SupplyItemPayload>
)

@Serializable
data class SupplyItemPayload(
    @SerialName("inventory_id") val inventoryId: String,
    val quantity: Double,
    @SerialName("unit_cost") val unitCost: Double,
    val source: String,
    @SerialName("exclude_cost") val excludeCost: Boolean
)

@Serializable
data class PhotoPayload(
    val url: String,
    val caption: String? = null
)
