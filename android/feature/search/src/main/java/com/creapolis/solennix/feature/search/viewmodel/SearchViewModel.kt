package com.creapolis.solennix.feature.search.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.data.repository.RecentSearchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import javax.inject.Inject

enum class SearchScope {
    ALL, CLIENTS, EVENTS, PRODUCTS, INVENTORY
}

@Serializable
data class SearchResponse(
    val clients: List<Client> = emptyList(),
    val products: List<Product> = emptyList(),
    val inventory: List<InventoryItem> = emptyList(),
    val events: List<Event> = emptyList()
)

data class SearchUiState(
    val query: String = "",
    val clients: List<Client> = emptyList(),
    val events: List<Event> = emptyList(),
    val products: List<Product> = emptyList(),
    val inventory: List<InventoryItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@OptIn(FlowPreview::class)
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val apiService: ApiService,
    private val recentSearchRepository: RecentSearchRepository,
    private val logger: com.creapolis.solennix.core.network.log.SolennixLogger,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _query = MutableStateFlow("")
    private val _searchResult = MutableStateFlow(SearchUiState())
    val selectedScope = MutableStateFlow(SearchScope.ALL)

    val uiState: StateFlow<SearchUiState> = _searchResult.asStateFlow()
    val recentQueries: StateFlow<List<String>> = recentSearchRepository.recentQueries
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    init {
        viewModelScope.launch {
            _query
                .debounce(300)
                .distinctUntilChanged()
                .collectLatest { query ->
                    val trimmed = query.trim()
                    if (trimmed.length < 2) {
                        logger.d(TAG, "Query trimmed length < 2, clearing results")
                        _searchResult.value = SearchUiState(query = query)
                    } else {
                        logger.d(TAG, "Starting search")
                        _searchResult.value = _searchResult.value.copy(
                            query = query,
                            isLoading = true,
                            error = null
                        )
                        try {
                            val response: SearchResponse = apiService.get(
                                Endpoints.SEARCH,
                                mapOf("q" to trimmed)
                            )
                            logger.d(
                                TAG,
                                "Search success. Clients: ${response.clients.size}, Events: ${response.events.size}, Products: ${response.products.size}, Inventory: ${response.inventory.size}"
                            )
                            _searchResult.value = SearchUiState(
                                query = query,
                                clients = response.clients,
                                events = response.events,
                                products = response.products,
                                inventory = response.inventory,
                                isLoading = false
                            )
                        } catch (e: kotlinx.coroutines.CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            logger.e(TAG, "Search error", e)
                            _searchResult.value = _searchResult.value.copy(
                                isLoading = false,
                                error = "Error al buscar. Intentá de nuevo."
                            )
                        }
                    }
                }
        }

        val initialQuery = savedStateHandle.get<String>("query")
        if (!initialQuery.isNullOrBlank()) {
            onQueryChange(initialQuery)
        }
    }

    fun onQueryChange(query: String) {
        _query.value = query
        _searchResult.value = _searchResult.value.copy(query = query)
    }

    fun saveRecentQuery(query: String) {
        viewModelScope.launch {
            recentSearchRepository.addQuery(query)
        }
    }

    fun clearRecentQueries() {
        viewModelScope.launch {
            recentSearchRepository.clearQueries()
        }
    }

    fun updateScope(scope: SearchScope) {
        selectedScope.value = scope
    }

    fun getFilteredResults(): SearchUiState {
        val scope = selectedScope.value
        val baseState = _searchResult.value

        return when (scope) {
            SearchScope.ALL -> baseState
            SearchScope.CLIENTS -> baseState.copy(
                events = emptyList(),
                products = emptyList(),
                inventory = emptyList()
            )
            SearchScope.EVENTS -> baseState.copy(
                clients = emptyList(),
                products = emptyList(),
                inventory = emptyList()
            )
            SearchScope.PRODUCTS -> baseState.copy(
                clients = emptyList(),
                events = emptyList(),
                inventory = emptyList()
            )
            SearchScope.INVENTORY -> baseState.copy(
                clients = emptyList(),
                events = emptyList(),
                products = emptyList()
            )
        }
    }

    private companion object {
        const val TAG = "SearchViewModel"
    }
}
