package com.creapolis.solennix.feature.staff.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Staff
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class StaffSortOption(val label: String) {
    NAME_ASC("Nombre (A-Z)"),
    NAME_DESC("Nombre (Z-A)"),
    ROLE("Rol")
}

data class StaffListUiState(
    val staff: List<Staff> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val searchQuery: String = "",
    val sortOption: StaffSortOption = StaffSortOption.NAME_ASC
)

@HiltViewModel
class StaffListViewModel @Inject constructor(
    private val staffRepository: StaffRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isRefreshing = MutableStateFlow(false)
    private val _sortOption = MutableStateFlow(StaffSortOption.NAME_ASC)

    val uiState: StateFlow<StaffListUiState> = combine(
        staffRepository.getStaff(),
        _searchQuery,
        _isRefreshing,
        _sortOption
    ) { staff, query, refreshing, sortOption ->
        val filtered = if (query.isBlank()) {
            staff
        } else {
            staff.filter {
                it.name.contains(query, ignoreCase = true) ||
                    (it.roleLabel?.contains(query, ignoreCase = true) == true) ||
                    (it.email?.contains(query, ignoreCase = true) == true) ||
                    (it.phone?.contains(query, ignoreCase = true) == true)
            }
        }

        val sorted = when (sortOption) {
            StaffSortOption.NAME_ASC -> filtered.sortedBy { it.name.lowercase() }
            StaffSortOption.NAME_DESC -> filtered.sortedByDescending { it.name.lowercase() }
            StaffSortOption.ROLE -> filtered.sortedBy { (it.roleLabel ?: "zzzz").lowercase() }
        }

        StaffListUiState(
            staff = sorted,
            isRefreshing = refreshing,
            searchQuery = query,
            sortOption = sortOption
        )
    }.distinctUntilChanged().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = StaffListUiState(isLoading = true)
    )

    init {
        refresh()
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onSortOptionChange(option: StaffSortOption) {
        _sortOption.value = option
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                staffRepository.syncStaff()
            } catch (_: Exception) {
                // Non-fatal, UI cae al cache
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    var deleteErrorMessage by mutableStateOf<String?>(null)
        private set

    fun clearDeleteError() {
        deleteErrorMessage = null
    }

    fun deleteStaff(staffId: String) {
        viewModelScope.launch {
            try {
                staffRepository.deleteStaff(staffId)
            } catch (e: Exception) {
                deleteErrorMessage = e.message ?: "Error al eliminar"
            }
        }
    }
}
