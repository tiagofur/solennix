package com.creapolis.solennix.feature.settings.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.PublicProfileRepository
import com.creapolis.solennix.core.model.OrganizerPublicPortfolioItem
import com.creapolis.solennix.core.model.OrganizerPublicProfile
import com.creapolis.solennix.core.model.OrganizerPublicProfileUpsertRequest
import com.creapolis.solennix.core.model.PortfolioCreateRequest
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
    var socialsText by mutableStateOf("")

    var portfolio by mutableStateOf<List<OrganizerPublicPortfolioItem>>(emptyList())
    var portfolioLoading by mutableStateOf(false)
    var portfolioError by mutableStateOf<String?>(null)
    var newPortfolioTitle by mutableStateOf("")
    var newPortfolioPhotoUrl by mutableStateOf("")
    var newPortfolioEventDate by mutableStateOf("")
    var isAddingPortfolio by mutableStateOf(false)

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
            } else {
                portfolio = emptyList()
            }
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
            socialsText = profile.socials
                ?.entries
                ?.sortedBy { it.key }
                ?.joinToString(",") { "${it.key}=${it.value}" }
                .orEmpty()
        } else {
            showReviews = false
            showPortfolio = false
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
}
