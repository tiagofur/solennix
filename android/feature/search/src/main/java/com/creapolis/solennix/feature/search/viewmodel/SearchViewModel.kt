package com.creapolis.solennix.feature.search.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.serialization.Serializable
import javax.inject.Inject

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
    private val apiService: ApiService
) : ViewModel() {

    private val _query = MutableStateFlow("")
    private val _searchResult = MutableStateFlow(SearchUiState())

    val uiState: StateFlow<SearchUiState> = _searchResult.asStateFlow()

    init {
        _query
            .debounce(300)
            .distinctUntilChanged()
            .onEach { query ->
                if (query.isBlank()) {
                    _searchResult.value = SearchUiState(query = query)
                } else {
                    _searchResult.value = _searchResult.value.copy(
                        query = query,
                        isLoading = true,
                        error = null
                    )
                    try {
                        val response: SearchResponse = apiService.get(
                            Endpoints.SEARCH,
                            mapOf("q" to query)
                        )
                        _searchResult.value = SearchUiState(
                            query = query,
                            clients = response.clients,
                            events = response.events,
                            products = response.products,
                            inventory = response.inventory,
                            isLoading = false
                        )
                    } catch (e: Exception) {
                        _searchResult.value = _searchResult.value.copy(
                            isLoading = false,
                            error = "Error al buscar: ${e.message}"
                        )
                    }
                }
            }
            .launchIn(viewModelScope)
    }

    fun onQueryChange(query: String) {
        _query.value = query
        // Update query immediately for the text field, search will follow after debounce
        _searchResult.value = _searchResult.value.copy(query = query)
    }
}
