package com.creapolis.solennix.feature.staff.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
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

data class StaffTeamDetailUiState(
    val team: StaffTeam? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

@HiltViewModel
class StaffTeamDetailViewModel @Inject constructor(
    private val teamRepository: StaffTeamRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val teamId: String = checkNotNull(savedStateHandle["teamId"])

    private val _uiState = MutableStateFlow(StaffTeamDetailUiState())
    val uiState: StateFlow<StaffTeamDetailUiState> = _uiState.asStateFlow()

    var deleteSuccess by mutableStateOf(false)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val team = teamRepository.getTeam(teamId)
                _uiState.update { it.copy(team = team, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "No pudimos cargar el equipo: ${e.message}"
                    )
                }
            }
        }
    }

    fun deleteTeam() {
        viewModelScope.launch {
            try {
                teamRepository.deleteTeam(teamId)
                deleteSuccess = true
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = "No pudimos eliminar el equipo: ${e.message}")
                }
            }
        }
    }
}
