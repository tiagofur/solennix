package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.DataEnvelope
import com.creapolis.solennix.core.model.FaqCreateRequest
import com.creapolis.solennix.core.model.OrganizerPublicFaqItem
import com.creapolis.solennix.core.model.OrganizerPublicPackage
import com.creapolis.solennix.core.model.OrganizerPublicPortfolioItem
import com.creapolis.solennix.core.model.OrganizerPublicProfile
import com.creapolis.solennix.core.model.OrganizerPublicProfileUpsertRequest
import com.creapolis.solennix.core.model.PackageCreateRequest
import com.creapolis.solennix.core.model.PortfolioCreateRequest
import com.creapolis.solennix.core.model.PublicProfileServiceSelectionItem
import com.creapolis.solennix.core.model.SetPublicProfileServicesRequest
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
    suspend fun listServices(): List<PublicProfileServiceSelectionItem>
    suspend fun setServices(body: SetPublicProfileServicesRequest): List<PublicProfileServiceSelectionItem>
    suspend fun listPackages(): List<OrganizerPublicPackage>
    suspend fun createPackage(body: PackageCreateRequest): OrganizerPublicPackage
    suspend fun deletePackage(id: String)
    suspend fun listFaq(): List<OrganizerPublicFaqItem>
    suspend fun createFaqItem(body: FaqCreateRequest): OrganizerPublicFaqItem
    suspend fun deleteFaqItem(id: String)
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

    override suspend fun listServices(): List<PublicProfileServiceSelectionItem> {
        return apiService.get(Endpoints.MY_PUBLIC_PROFILE_SERVICES) ?: emptyList()
    }

    override suspend fun setServices(
        body: SetPublicProfileServicesRequest
    ): List<PublicProfileServiceSelectionItem> {
        return apiService.put(Endpoints.MY_PUBLIC_PROFILE_SERVICES, body) ?: emptyList()
    }

    override suspend fun listPackages(): List<OrganizerPublicPackage> {
        return apiService.get(Endpoints.MY_PUBLIC_PROFILE_PACKAGES) ?: emptyList()
    }

    override suspend fun createPackage(body: PackageCreateRequest): OrganizerPublicPackage {
        return apiService.post(Endpoints.MY_PUBLIC_PROFILE_PACKAGES, body)
    }

    override suspend fun deletePackage(id: String) {
        apiService.delete(Endpoints.myPublicProfilePackage(id))
    }

    override suspend fun listFaq(): List<OrganizerPublicFaqItem> {
        return apiService.get(Endpoints.MY_PUBLIC_PROFILE_FAQ) ?: emptyList()
    }

    override suspend fun createFaqItem(body: FaqCreateRequest): OrganizerPublicFaqItem {
        return apiService.post(Endpoints.MY_PUBLIC_PROFILE_FAQ, body)
    }

    override suspend fun deleteFaqItem(id: String) {
        apiService.delete(Endpoints.myPublicProfileFaqItem(id))
    }
}
