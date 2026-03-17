package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
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
        val payload = mapOf(
            "products" to products.map { 
                mapOf(
                    "product_id" to it.productId,
                    "quantity" to it.quantity,
                    "unit_price" to it.unitPrice,
                    "discount" to it.discount
                )
            },
            "extras" to extras.map { 
                mapOf(
                    "description" to it.description,
                    "cost" to it.cost,
                    "price" to it.price,
                    "exclude_utility" to it.excludeUtility
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
}

@Serializable
data class EventItemsResponse(
    val products: List<EventProduct>,
    val extras: List<EventExtra>
)
