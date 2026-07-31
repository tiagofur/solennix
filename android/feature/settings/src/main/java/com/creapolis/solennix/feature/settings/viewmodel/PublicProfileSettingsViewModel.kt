package com.creapolis.solennix.feature.settings.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.PublicProfileRepository
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
import com.creapolis.solennix.core.model.SolennixUrls
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.SolennixException
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.feature.settings.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PublicProfileSettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authManager: AuthManager,
    private val apiService: ApiService,
    private val publicProfileRepository: PublicProfileRepository
) : ViewModel() {

    companion object {
        const val PORTFOLIO_MAX = 6
        const val PACKAGES_MAX = 6
        const val FAQ_MAX = 12
        val SLUG_REGEX = Regex("^[a-z0-9]+(?:-[a-z0-9]+)*$")

        fun parseSocials(text: String): Map<String, String> {
            val trimmed = text.trim()
            if (trimmed.isEmpty()) return emptyMap()
            val out = linkedMapOf<String, String>()
            for (pair in trimmed.split(",")) {
                val parts = pair.split("=", limit = 2)
                if (parts.size != 2) continue
                val key = parts[0].trim()
                val value = parts[1].trim()
                if (key.isNotEmpty() && value.isNotEmpty()) out[key] = value
            }
            return out
        }

        /** Splits a comma-separated string into a trimmed, non-empty list. */
        fun splitList(text: String): List<String> =
            text.split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }

        /** Comma-joins a list for TextField editing. */
        fun joinList(list: List<String>?): String =
            list?.joinToString(", ").orEmpty()
    }

    var isEnabled by mutableStateOf(false)
    var slug by mutableStateOf("")
    var headline by mutableStateOf("")
    var city by mutableStateOf("")
    var region by mutableStateOf("")
    var country by mutableStateOf("")
    var contactType by mutableStateOf("email")
    var contactValue by mutableStateOf("")
    var showPrices by mutableStateOf(false)
    var showServices by mutableStateOf(true)
    var showReviews by mutableStateOf(true)
    var showPortfolio by mutableStateOf(true)
    var showContact by mutableStateOf(true)
    var showPackages by mutableStateOf(true)
    var showFaq by mutableStateOf(true)
    var showPolicies by mutableStateOf(false)
    var about by mutableStateOf("")
    var serviceAreasText by mutableStateOf("")
    var eventTypesText by mutableStateOf("")
    var languagesText by mutableStateOf("")
    var minGuestsText by mutableStateOf("")
    var maxGuestsText by mutableStateOf("")
    var responseTime by mutableStateOf("")
    var socialsText by mutableStateOf("")

    var portfolio by mutableStateOf<List<OrganizerPublicPortfolioItem>>(emptyList())
    var portfolioLoading by mutableStateOf(false)
    var portfolioError by mutableStateOf<String?>(null)
    var newPortfolioTitle by mutableStateOf("")
    var newPortfolioPhotoUrl by mutableStateOf("")
    var newPortfolioEventDate by mutableStateOf("")
    var isAddingPortfolio by mutableStateOf(false)

    var services by mutableStateOf<List<PublicProfileServiceSelectionItem>>(emptyList())
    var servicesLoading by mutableStateOf(false)
    var servicesError by mutableStateOf<String?>(null)
    var isSavingServices by mutableStateOf(false)

    var packages by mutableStateOf<List<OrganizerPublicPackage>>(emptyList())
    var packagesLoading by mutableStateOf(false)
    var packagesError by mutableStateOf<String?>(null)
    var newPackageTitle by mutableStateOf("")
    var newPackageDescription by mutableStateOf("")
    var newPackagePrice by mutableStateOf("")
    var newPackageInclusions by mutableStateOf("")
    var isAddingPackage by mutableStateOf(false)

    var faq by mutableStateOf<List<OrganizerPublicFaqItem>>(emptyList())
    var faqLoading by mutableStateOf(false)
    var faqError by mutableStateOf<String?>(null)
    var newFaqQuestion by mutableStateOf("")
    var newFaqAnswer by mutableStateOf("")
    var isAddingFaq by mutableStateOf(false)

    var isLoading by mutableStateOf(true)
    var isSaving by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var slugError by mutableStateOf<String?>(null)
    var saveSuccess by mutableStateOf(false)
    var user by mutableStateOf<User?>(null)

    val isPaid: Boolean
        get() = user?.plan?.isPaid == true

    val shareUrl: String?
        get() {
            val trimmed = slug.trim()
            return if (trimmed.isEmpty()) null else SolennixUrls.publicProfileUrl(trimmed)
        }

    val contactTypes = listOf("phone", "whatsapp", "email", "url")

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            slugError = null
            try {
                val freshUser: User = apiService.get(Endpoints.ME)
                authManager.storeUser(freshUser)
                user = freshUser

                val profile = publicProfileRepository.getMyPublicProfile()
                applyProfile(profile)
            } catch (e: Exception) {
                user = authManager.currentUser.value
                errorMessage = context.getString(
                    R.string.settings_public_profile_load_failed
                )
            } finally {
                isLoading = false
            }

            if (isPaid) {
                loadPortfolio()
                loadPackages()
                loadFaq()
            } else {
                portfolio = emptyList()
                packages = emptyList()
                faq = emptyList()
            }
            // Services selection has no plan gate.
            loadServices()
        }
    }

    private fun loadPortfolio() {
        viewModelScope.launch {
            portfolioLoading = true
            portfolioError = null
            try {
                portfolio = publicProfileRepository.listPortfolio()
                    .sortedBy { it.sortOrder }
            } catch (_: Exception) {
                portfolioError = context.getString(
                    R.string.settings_public_profile_portfolio_load_failed
                )
            } finally {
                portfolioLoading = false
            }
        }
    }

    private fun applyProfile(profile: OrganizerPublicProfile) {
        isEnabled = profile.isEnabled
        slug = profile.publicSlug ?: user?.publicSlug.orEmpty()
        headline = profile.headline.orEmpty()
        city = profile.city.orEmpty()
        region = profile.region.orEmpty()
        country = profile.country.orEmpty()
        val incomingContactType = profile.contactType
        if (!incomingContactType.isNullOrBlank()) {
            contactType = incomingContactType
        }
        contactValue = profile.contactValue.orEmpty()
        showPrices = profile.showPrices
        showServices = profile.showServices
        showContact = profile.showContact
        if (isPaid) {
            showReviews = profile.showReviews
            showPortfolio = profile.showPortfolio
            showPackages = profile.showPackages
            showFaq = profile.showFaq
            showPolicies = profile.showPolicies
            about = profile.about.orEmpty()
            serviceAreasText = joinList(profile.serviceAreas)
            eventTypesText = joinList(profile.eventTypes)
            languagesText = joinList(profile.languages)
            minGuestsText = profile.minGuests?.toString().orEmpty()
            maxGuestsText = profile.maxGuests?.toString().orEmpty()
            responseTime = profile.responseTime.orEmpty()
            socialsText = profile.socials
                ?.entries
                ?.sortedBy { it.key }
                ?.joinToString(",") { "${it.key}=${it.value}" }
                .orEmpty()
        } else {
            showReviews = false
            showPortfolio = false
            showPackages = false
            showFaq = false
            showPolicies = false
            about = ""
            serviceAreasText = ""
            eventTypesText = ""
            languagesText = ""
            minGuestsText = ""
            maxGuestsText = ""
            responseTime = ""
            socialsText = ""
        }
    }

    fun validateSlug(value: String): String? {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) return null
        if (trimmed.length < 3 || trimmed.length > 140) {
            return context.getString(R.string.settings_public_profile_slug_length_error)
        }
        if (!SLUG_REGEX.matches(trimmed)) {
            return context.getString(R.string.settings_public_profile_slug_format_error)
        }
        return null
    }

    fun onSlugChange(value: String) {
        slug = value
        slugError = validateSlug(value)
    }

    fun save() {
        viewModelScope.launch {
            errorMessage = null
            val trimmedSlug = slug.trim()

            if (isEnabled && trimmedSlug.isEmpty()) {
                slugError = context.getString(
                    R.string.settings_public_profile_slug_required_on_enable
                )
                return@launch
            }
            val slugErr = validateSlug(trimmedSlug)
            if (slugErr != null) {
                slugError = slugErr
                return@launch
            }

            isSaving = true
            try {
                val body = OrganizerPublicProfileUpsertRequest(
                    isEnabled = isEnabled,
                    publicSlug = trimmedSlug.ifEmpty { null },
                    headline = headline.ifEmpty { null },
                    contactType = contactType,
                    contactValue = contactValue.ifEmpty { null },
                    city = city.ifEmpty { null },
                    region = region.ifEmpty { null },
                    country = country.ifEmpty { null },
                    showPrices = showPrices,
                    showServices = showServices,
                    showReviews = if (isPaid) showReviews else false,
                    showPortfolio = if (isPaid) showPortfolio else false,
                    showContact = showContact,
                    showPackages = if (isPaid) showPackages else false,
                    showFaq = if (isPaid) showFaq else false,
                    showPolicies = if (isPaid) showPolicies else false,
                    about = if (isPaid && about.isNotBlank()) about else null,
                    serviceAreas = if (isPaid) splitList(serviceAreasText) else null,
                    eventTypes = if (isPaid) splitList(eventTypesText) else null,
                    languages = if (isPaid) splitList(languagesText) else null,
                    minGuests = if (isPaid) minGuestsText.trim().toIntOrNull() else null,
                    maxGuests = if (isPaid) maxGuestsText.trim().toIntOrNull() else null,
                    responseTime = if (isPaid && responseTime.isNotBlank()) responseTime else null,
                    socials = if (isPaid) parseSocials(socialsText) else emptyMap()
                )
                val saved = publicProfileRepository.upsertMyPublicProfile(body)
                applyProfile(saved)
                saved.publicSlug?.let { slug = it }
                saveSuccess = true
            } catch (e: SolennixException.Server) {
                errorMessage = when (e.code) {
                    409 -> context.getString(R.string.settings_public_profile_slug_taken)
                    403 -> context.getString(R.string.settings_public_profile_plan_required)
                    else -> context.getString(R.string.settings_public_profile_save_failed)
                }
            } catch (e: SolennixException.PlanLimitExceeded) {
                errorMessage = context.getString(R.string.settings_public_profile_plan_required)
            } catch (_: Exception) {
                errorMessage = context.getString(R.string.settings_public_profile_save_failed)
            } finally {
                isSaving = false
            }
        }
    }

    fun addPortfolioItem() {
        viewModelScope.launch {
            portfolioError = null
            val title = newPortfolioTitle.trim()
            val photo = newPortfolioPhotoUrl.trim()
            if (title.isEmpty() || photo.isEmpty()) {
                portfolioError = context.getString(
                    R.string.settings_public_profile_portfolio_save_failed
                )
                return@launch
            }
            if (portfolio.size >= PORTFOLIO_MAX) {
                portfolioError = context.getString(
                    R.string.settings_public_profile_portfolio_max
                )
                return@launch
            }
            isAddingPortfolio = true
            try {
                val created = publicProfileRepository.createPortfolioItem(
                    PortfolioCreateRequest(
                        title = title,
                        photoUrl = photo,
                        eventDate = newPortfolioEventDate.trim().ifEmpty { null },
                        sortOrder = portfolio.size
                    )
                )
                portfolio = (portfolio + created).sortedBy { it.sortOrder }
                newPortfolioTitle = ""
                newPortfolioPhotoUrl = ""
                newPortfolioEventDate = ""
            } catch (_: Exception) {
                portfolioError = context.getString(
                    R.string.settings_public_profile_portfolio_save_failed
                )
            } finally {
                isAddingPortfolio = false
            }
        }
    }

    fun deletePortfolioItem(id: String) {
        viewModelScope.launch {
            portfolioError = null
            try {
                publicProfileRepository.deletePortfolioItem(id)
                portfolio = portfolio.filterNot { it.id == id }
            } catch (_: Exception) {
                portfolioError = context.getString(
                    R.string.settings_public_profile_portfolio_delete_failed
                )
            }
        }
    }

    // MARK: - Services

    private fun loadServices() {
        viewModelScope.launch {
            servicesLoading = true
            servicesError = null
            try {
                services = publicProfileRepository.listServices()
                    .sortedWith(compareByDescending<PublicProfileServiceSelectionItem> { it.isFeatured }.thenBy { it.name })
            } catch (_: Exception) {
                servicesError = context.getString(
                    R.string.settings_public_profile_services_load_failed
                )
            } finally {
                servicesLoading = false
            }
        }
    }

    fun toggleService(id: String) {
        viewModelScope.launch {
            val idx = services.indexOfFirst { it.id == id }
            if (idx < 0) return@launch
            services = services.toMutableList().also {
                it[idx] = it[idx].copy(showOnPublicProfile = !it[idx].showOnPublicProfile)
            }
            saveServices()
        }
    }

    private fun saveServices() {
        viewModelScope.launch {
            servicesError = null
            isSavingServices = true
            try {
                val ids = services.filter { it.showOnPublicProfile }.map { it.id }
                val updated = publicProfileRepository.setServices(
                    SetPublicProfileServicesRequest(productIds = ids)
                )
                services = updated.sortedWith(
                    compareByDescending<PublicProfileServiceSelectionItem> { it.isFeatured }.thenBy { it.name }
                )
            } catch (_: Exception) {
                servicesError = context.getString(
                    R.string.settings_public_profile_services_save_failed
                )
            } finally {
                isSavingServices = false
            }
        }
    }

    // MARK: - Packages (Pro+)

    private fun loadPackages() {
        viewModelScope.launch {
            packagesLoading = true
            packagesError = null
            try {
                packages = publicProfileRepository.listPackages()
                    .sortedWith(compareByDescending<OrganizerPublicPackage> { it.isFeatured }.thenBy { it.sortOrder })
            } catch (_: Exception) {
                packagesError = context.getString(
                    R.string.settings_public_profile_packages_load_failed
                )
            } finally {
                packagesLoading = false
            }
        }
    }

    fun addPackage() {
        viewModelScope.launch {
            packagesError = null
            val title = newPackageTitle.trim()
            if (title.isEmpty()) {
                packagesError = context.getString(
                    R.string.settings_public_profile_packages_save_failed
                )
                return@launch
            }
            if (packages.size >= PACKAGES_MAX) {
                packagesError = context.getString(
                    R.string.settings_public_profile_packages_max
                )
                return@launch
            }
            isAddingPackage = true
            try {
                val inclusions = splitList(newPackageInclusions)
                val created = publicProfileRepository.createPackage(
                    PackageCreateRequest(
                        title = title,
                        description = newPackageDescription.trim().ifEmpty { null },
                        fromPrice = newPackagePrice.trim().toDoubleOrNull(),
                        inclusions = inclusions.ifEmpty { null },
                        sortOrder = packages.size
                    )
                )
                packages = (packages + created)
                    .sortedWith(compareByDescending<OrganizerPublicPackage> { it.isFeatured }.thenBy { it.sortOrder })
                newPackageTitle = ""
                newPackageDescription = ""
                newPackagePrice = ""
                newPackageInclusions = ""
            } catch (_: Exception) {
                packagesError = context.getString(
                    R.string.settings_public_profile_packages_save_failed
                )
            } finally {
                isAddingPackage = false
            }
        }
    }

    fun deletePackage(id: String) {
        viewModelScope.launch {
            packagesError = null
            try {
                publicProfileRepository.deletePackage(id)
                packages = packages.filterNot { it.id == id }
            } catch (_: Exception) {
                packagesError = context.getString(
                    R.string.settings_public_profile_packages_delete_failed
                )
            }
        }
    }

    // MARK: - FAQ (Pro+)

    private fun loadFaq() {
        viewModelScope.launch {
            faqLoading = true
            faqError = null
            try {
                faq = publicProfileRepository.listFaq().sortedBy { it.sortOrder }
            } catch (_: Exception) {
                faqError = context.getString(
                    R.string.settings_public_profile_faq_load_failed
                )
            } finally {
                faqLoading = false
            }
        }
    }

    fun addFaqItem() {
        viewModelScope.launch {
            faqError = null
            val question = newFaqQuestion.trim()
            val answer = newFaqAnswer.trim()
            if (question.isEmpty() || answer.isEmpty()) {
                faqError = context.getString(
                    R.string.settings_public_profile_faq_save_failed
                )
                return@launch
            }
            if (faq.size >= FAQ_MAX) {
                faqError = context.getString(
                    R.string.settings_public_profile_faq_max
                )
                return@launch
            }
            isAddingFaq = true
            try {
                val created = publicProfileRepository.createFaqItem(
                    FaqCreateRequest(question = question, answer = answer, sortOrder = faq.size)
                )
                faq = (faq + created).sortedBy { it.sortOrder }
                newFaqQuestion = ""
                newFaqAnswer = ""
            } catch (_: Exception) {
                faqError = context.getString(
                    R.string.settings_public_profile_faq_save_failed
                )
            } finally {
                isAddingFaq = false
            }
        }
    }

    fun deleteFaqItem(id: String) {
        viewModelScope.launch {
            faqError = null
            try {
                publicProfileRepository.deleteFaqItem(id)
                faq = faq.filterNot { it.id == id }
            } catch (_: Exception) {
                faqError = context.getString(
                    R.string.settings_public_profile_faq_delete_failed
                )
            }
        }
    }
}
