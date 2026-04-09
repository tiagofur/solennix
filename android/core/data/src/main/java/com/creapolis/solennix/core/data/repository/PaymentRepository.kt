package com.creapolis.solennix.core.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.creapolis.solennix.core.data.paging.RemotePagingSource
import com.creapolis.solennix.core.database.dao.PaymentDao
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.CreatePaymentRequest
import com.creapolis.solennix.core.model.PaginatedResponse
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.Endpoints
import io.ktor.util.reflect.typeInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

interface PaymentRepository {
    fun getPayments(): Flow<List<Payment>>
    fun getPaymentsByEventId(eventId: String): Flow<List<Payment>>
    suspend fun getPayment(id: String): Payment?
    suspend fun syncPayments()
    suspend fun syncPaymentsByEventId(eventId: String)
    suspend fun createPayment(payment: Payment): Payment
    suspend fun updatePayment(payment: Payment): Payment
    suspend fun deletePayment(id: String)

    /**
     * Returns a [PagingData] stream that loads payment pages directly from
     * the remote API using server-side pagination.
     */
    fun getPaymentsRemotePaging(
        sort: String = "payment_date",
        order: String = "desc",
        eventId: String? = null
    ): Flow<PagingData<Payment>>
}

@Singleton
class OfflineFirstPaymentRepository @Inject constructor(
    private val paymentDao: PaymentDao,
    private val apiService: ApiService
) : PaymentRepository {

    override fun getPayments(): Flow<List<Payment>> =
        paymentDao.getPayments().map { it.map { entity -> entity.asExternalModel() } }

    override fun getPaymentsByEventId(eventId: String): Flow<List<Payment>> =
        paymentDao.getPaymentsByEventId(eventId).map { it.map { entity -> entity.asExternalModel() } }

    override suspend fun getPayment(id: String): Payment? =
        paymentDao.getPayment(id)?.asExternalModel()

    override suspend fun syncPayments() {
        val networkPayments: List<Payment> = apiService.get(Endpoints.PAYMENTS)
        paymentDao.insertPayments(networkPayments.map { it.asEntity() })
    }

    override suspend fun syncPaymentsByEventId(eventId: String) {
        val networkPayments: List<Payment> = apiService.get(Endpoints.PAYMENTS, mapOf("event_id" to eventId))
        paymentDao.insertPayments(networkPayments.map { it.asEntity() })
    }

    override suspend fun createPayment(payment: Payment): Payment {
        val request = CreatePaymentRequest(
            eventId = payment.eventId,
            userId = payment.userId,
            amount = payment.amount,
            paymentDate = payment.paymentDate,
            paymentMethod = payment.paymentMethod,
            notes = payment.notes
        )
        val networkPayment: Payment = apiService.post(Endpoints.PAYMENTS, request)
        paymentDao.insertPayments(listOf(networkPayment.asEntity()))
        return networkPayment
    }

    override suspend fun updatePayment(payment: Payment): Payment {
        val networkPayment: Payment = apiService.put(Endpoints.payment(payment.id), payment)
        paymentDao.insertPayments(listOf(networkPayment.asEntity()))
        return networkPayment
    }

    override suspend fun deletePayment(id: String) {
        apiService.delete(Endpoints.payment(id))
        val cached = paymentDao.getPayment(id)
        if (cached != null) {
            paymentDao.deletePayment(cached)
        }
    }

    override fun getPaymentsRemotePaging(
        sort: String,
        order: String,
        eventId: String?
    ): Flow<PagingData<Payment>> {
        val params = buildMap {
            put("sort", sort)
            put("order", order)
            if (!eventId.isNullOrBlank()) put("event_id", eventId)
        }
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = true
            ),
            pagingSourceFactory = {
                RemotePagingSource<Payment>(
                    apiService = apiService,
                    endpoint = Endpoints.PAYMENTS,
                    params = params,
                    typeInfo = typeInfo<PaginatedResponse<Payment>>(),
                    pageSize = 20
                )
            }
        ).flow
    }
}
