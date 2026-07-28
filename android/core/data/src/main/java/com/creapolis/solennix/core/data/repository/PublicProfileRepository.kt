package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.DataEnvelope
import com.creapolis.solennix.core.model.OrganizerPublicPortfolioItem
import com.creapolis.solennix.core.model.OrganizerPublicProfile
import com.creapolis.solennix.core.model.OrganizerPublicProfileUpsertRequest
import com.creapolis.solennix.core.model.PortfolioCreateRequest
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Session-scoped repository for the organizer public-profile Settings screen.
 * No local cache — every call hits the network (same pattern as
 * [EventPublicLinkRepository]).
 */
interface PublicProfileRepository {
    suspend fun getMyPublicProfile(): OrganizerPublicProfile
    suspend fun upsertMyPublicProfile(body: OrganizerPublicProfileUpsertRequest): OrganizerPublicProfile
    suspend fun listPortfolio(): List<OrganizerPublicPortfolioItem>
    suspend fun createPortfolioItem(body: PortfolioCreateRequest): OrganizerPublicPortfolioItem
    suspend fun deletePortfolioItem(id: String)
}

@Singleton
class DefaultPublicProfileRepository @Inject constructor(
    private val apiService: ApiService
) : PublicProfileRepository {

    override suspend fun getMyPublicProfile(): OrganizerPublicProfile {
        val envelope: DataEnvelope<OrganizerPublicProfile> =
            apiService.get(Endpoints.MY_PUBLIC_PROFILE)
        return envelope.data
    }

    override suspend fun upsertMyPublicProfile(
        body: OrganizerPublicProfileUpsertRequest
    ): OrganizerPublicProfile {
        val envelope: DataEnvelope<OrganizerPublicProfile> =
            apiService.put(Endpoints.MY_PUBLIC_PROFILE, body)
        return envelope.data
    }

    override suspend fun listPortfolio(): List<OrganizerPublicPortfolioItem> {
        return apiService.get(Endpoints.MY_PUBLIC_PROFILE_PORTFOLIO) ?: emptyList()
    }

    override suspend fun createPortfolioItem(
        body: PortfolioCreateRequest
    ): OrganizerPublicPortfolioItem {
        return apiService.post(Endpoints.MY_PUBLIC_PROFILE_PORTFOLIO, body)
    }

    override suspend fun deletePortfolioItem(id: String) {
        apiService.delete(Endpoints.myPublicProfilePortfolioItem(id))
    }
}
