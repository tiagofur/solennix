package com.creapolis.solennix.feature.clients.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.clients.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.annotation.StringRes

enum class ClientSortOption(@StringRes val labelRes: Int) {
    NAME_ASC(R.string.clients_sort_name_asc),
    NAME_DESC(R.string.clients_sort_name_desc),
    MOST_EVENTS(R.string.clients_sort_most_events),
    HIGHEST_SPENT(R.string.clients_sort_highest_spent)
}

data class ClientListUiState(
    val clients: List<Client> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val searchQuery: String = "",
    val sortOption: ClientSortOption = ClientSortOption.NAME_ASC
)

@HiltViewModel
class ClientListViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager,
    @ApplicationContext private val context: Context
) : ViewModel() {

    // Plan limit check
    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set
    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached
    val nearLimitMessage: String?
        get() = (limitCheckResult as? LimitCheckResult.NearLimit)?.let { result ->
            context.getString(R.string.clients_limit_near, result.remaining)
        }
    val limitReachedMessage: String?
        get() = (limitCheckResult as? LimitCheckResult.LimitReached)?.let { result ->
            context.getString(R.string.clients_limit_reached, result.limit)
        }

    private val _searchQuery = MutableStateFlow("")
    private val _isRefreshing = MutableStateFlow(false)
    private val _sortOption = MutableStateFlow(ClientSortOption.NAME_ASC)

    val uiState: StateFlow<ClientListUiState> = combine(
        clientRepository.getClients(),
        _searchQuery,
        _isRefreshing,
        _sortOption
    ) { clients, query, refreshing, sortOption ->
        val filteredClients = if (query.isBlank()) {
            clients
        } else {
            clients.filter {
                it.name.contains(query, ignoreCase = true) ||
                it.email?.contains(query, ignoreCase = true) == true
            }
        }

        val sortedClients = when (sortOption) {
            ClientSortOption.NAME_ASC -> filteredClients.sortedBy { it.name.lowercase() }
            ClientSortOption.NAME_DESC -> filteredClients.sortedByDescending { it.name.lowercase() }
            ClientSortOption.MOST_EVENTS -> filteredClients.sortedByDescending { it.totalEvents ?: 0 }
            ClientSortOption.HIGHEST_SPENT -> filteredClients.sortedByDescending { it.totalSpent ?: 0.0 }
        }

        ClientListUiState(
            clients = sortedClients,
            isRefreshing = refreshing,
            searchQuery = query,
            sortOption = sortOption
        )
    }.distinctUntilChanged().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ClientListUiState(isLoading = true)
    )

    init {
        refresh()
        checkPlanLimits()
    }

    private fun checkPlanLimits() {
        viewModelScope.launch {
            val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
            limitCheckResult = planLimitsManager.canCreateClient(plan)
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onSortOptionChange(option: ClientSortOption) {
        _sortOption.value = option
    }

    fun generateCsvContent(): String {
        val clients = uiState.value.clients
        val sb = StringBuilder()
        sb.appendLine(
            listOf(
                context.getString(R.string.clients_csv_header_name),
                context.getString(R.string.clients_csv_header_email),
                context.getString(R.string.clients_csv_header_phone),
                context.getString(R.string.clients_csv_header_events),
                context.getString(R.string.clients_csv_header_total_spent)
            ).joinToString(",")
        )
        clients.forEach { client ->
            val name = client.name.escapeCsv()
            val email = (client.email ?: "").escapeCsv()
            val phone = client.phone.escapeCsv()
            val events = (client.totalEvents ?: 0).toString()
            val spent = (client.totalSpent ?: 0.0).asMXN().escapeCsv()
            sb.appendLine("$name,$email,$phone,$events,$spent")
        }
        return sb.toString()
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                clientRepository.syncClients()
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isRefreshing.value = false
            }
        }
    }
}

private fun String.escapeCsv(): String {
    return if (contains(",") || contains("\"") || contains("\n")) {
        "\"${replace("\"", "\"\"")}\""
    } else {
        this
    }
}
