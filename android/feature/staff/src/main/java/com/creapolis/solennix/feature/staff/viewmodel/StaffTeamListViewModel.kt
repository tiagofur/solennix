package com.creapolis.solennix.feature.staff.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffTeamRepository
import com.creapolis.solennix.core.model.StaffTeam
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StaffTeamListUiState(
    val teams: List<StaffTeam> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class StaffTeamListViewModel @Inject constructor(
    private val teamRepository: StaffTeamRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(StaffTeamListUiState(isLoading = true))
    val uiState: StateFlow<StaffTeamListUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            try {
                val teams = teamRepository.listTeams()
                _uiState.update {
                    it.copy(
                        teams = teams.sortedBy { team -> team.name.lowercase() },
                        isLoading = false,
                        isRefreshing = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = "No pudimos cargar los equipos: ${e.message}"
                    )
                }
            }
        }
    }

    fun deleteTeam(id: String) {
        viewModelScope.launch {
            try {
                teamRepository.deleteTeam(id)
                _uiState.update { state ->
                    state.copy(teams = state.teams.filterNot { it.id == id })
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = "No pudimos eliminar el equipo: ${e.message}")
                }
            }
        }
    }
}
