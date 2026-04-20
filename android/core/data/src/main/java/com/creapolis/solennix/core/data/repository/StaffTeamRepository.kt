package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.StaffTeam
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repositorio de equipos (Ola 2 del módulo Personal). Network-only: los
 * equipos se consultan on-demand y no se cachean en Room porque son un
 * recurso de acceso puntual (form de evento, gestión eventual).
 */
interface StaffTeamRepository {
    suspend fun listTeams(): List<StaffTeam>
    suspend fun getTeam(id: String): StaffTeam
    suspend fun createTeam(team: StaffTeam): StaffTeam
    suspend fun updateTeam(team: StaffTeam): StaffTeam
    suspend fun deleteTeam(id: String)
}

@Singleton
class DefaultStaffTeamRepository @Inject constructor(
    private val apiService: ApiService
) : StaffTeamRepository {

    override suspend fun listTeams(): List<StaffTeam> =
        apiService.get(Endpoints.STAFF_TEAMS)

    override suspend fun getTeam(id: String): StaffTeam =
        apiService.get(Endpoints.staffTeam(id))

    override suspend fun createTeam(team: StaffTeam): StaffTeam =
        apiService.post(Endpoints.STAFF_TEAMS, team)

    override suspend fun updateTeam(team: StaffTeam): StaffTeam =
        apiService.put(Endpoints.staffTeam(team.id), team)

    override suspend fun deleteTeam(id: String) {
        apiService.delete(Endpoints.staffTeam(id))
    }
}
