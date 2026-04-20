package com.creapolis.solennix.core.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.creapolis.solennix.core.data.paging.RemotePagingSource
import com.creapolis.solennix.core.database.dao.StaffDao
import com.creapolis.solennix.core.database.entity.SyncStatus
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.EventStaff
import com.creapolis.solennix.core.model.PaginatedResponse
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.model.StaffAvailability
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.SolennixException
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import io.ktor.util.reflect.typeInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

interface StaffRepository {
    fun getStaff(): Flow<List<Staff>>
    fun getStaffCount(): Flow<Int>
    suspend fun getStaffMember(id: String): Staff?
    suspend fun syncStaff()
    suspend fun createStaff(staff: Staff): Staff
    suspend fun updateStaff(staff: Staff): Staff
    suspend fun deleteStaff(id: String)

    fun getStaffRemotePaging(
        sort: String = "name",
        order: String = "asc",
        query: String = ""
    ): Flow<PagingData<Staff>>

    // ===== Asignaciones por evento =====

    /** Stream en vivo desde Room — pinta inmediatamente, el sync es async. */
    fun getEventStaff(eventId: String): Flow<List<EventStaff>>

    /**
     * Trae las asignaciones del backend y reemplaza el cache local.
     * No-op silencioso si el GET falla (la UI cae al cache).
     */
    suspend fun syncEventStaff(eventId: String): List<EventStaff>

    /**
     * `GET /api/staff/availability` — sólo devuelve colaboradores CON asignaciones
     * en la ventana consultada. Si se pasa [date] se consulta ese día; si se pasan
     * [start]/[end] se consulta el rango.
     */
    suspend fun getStaffAvailability(
        date: String? = null,
        start: String? = null,
        end: String? = null
    ): List<StaffAvailability>
}

@Singleton
class OfflineFirstStaffRepository @Inject constructor(
    private val staffDao: StaffDao,
    private val apiService: ApiService
) : StaffRepository {

    override fun getStaff(): Flow<List<Staff>> =
        staffDao.getStaff().map { it.map { entity -> entity.asExternalModel() } }

    override fun getStaffCount(): Flow<Int> = staffDao.getStaffCount()

    override suspend fun getStaffMember(id: String): Staff? =
        staffDao.getStaffMember(id)?.asExternalModel()

    override suspend fun syncStaff() {
        val networkStaff: List<Staff> = apiService.get(Endpoints.STAFF)
        staffDao.insertStaff(networkStaff.map { it.asEntity() })
    }

    override suspend fun createStaff(staff: Staff): Staff {
        val networkStaff: Staff = apiService.post(Endpoints.STAFF, staff)
        staffDao.insertStaff(listOf(networkStaff.asEntity()))
        return networkStaff
    }

    override suspend fun updateStaff(staff: Staff): Staff {
        val networkStaff: Staff = apiService.put(Endpoints.staff(staff.id), staff)
        staffDao.insertStaff(listOf(networkStaff.asEntity()))
        return networkStaff
    }

    override suspend fun deleteStaff(id: String) {
        try {
            apiService.delete(Endpoints.staff(id))
            val cached = staffDao.getStaffMember(id)
            if (cached != null) {
                staffDao.deleteStaff(cached)
            }
        } catch (e: Exception) {
            if (e is SolennixException.Auth) throw e
            // Offline support: mark pending delete, SyncWorker will push later.
            staffDao.updateSyncStatus(id, SyncStatus.PENDING_DELETE)
        }
    }

    override fun getStaffRemotePaging(
        sort: String,
        order: String,
        query: String
    ): Flow<PagingData<Staff>> {
        val params = buildMap {
            put("sort", sort)
            put("order", order)
            if (query.isNotBlank()) put("q", query)
        }
        return Pager(
            config = PagingConfig(pageSize = 20, enablePlaceholders = true),
            pagingSourceFactory = {
                RemotePagingSource<Staff>(
                    apiService = apiService,
                    endpoint = Endpoints.STAFF,
                    params = params,
                    typeInfo = typeInfo<PaginatedResponse<Staff>>(),
                    pageSize = 20
                )
            }
        ).flow
    }

    override fun getEventStaff(eventId: String): Flow<List<EventStaff>> =
        staffDao.getEventStaff(eventId).map { list -> list.map { it.asExternalModel() } }

    override suspend fun syncEventStaff(eventId: String): List<EventStaff> {
        val remote: List<EventStaff> = apiService.get(Endpoints.eventStaff(eventId))
        staffDao.replaceEventStaff(eventId, remote.map { it.asEntity() })
        return remote
    }

    override suspend fun getStaffAvailability(
        date: String?,
        start: String?,
        end: String?
    ): List<StaffAvailability> {
        val params = buildMap {
            if (!date.isNullOrBlank()) put("date", date)
            if (!start.isNullOrBlank()) put("start", start)
            if (!end.isNullOrBlank()) put("end", end)
        }
        return apiService.get(Endpoints.STAFF_AVAILABILITY, params)
    }
}
