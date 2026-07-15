package com.creapolis.solennix.feature.staff.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.AssignmentExecutionState
import com.creapolis.solennix.core.model.AssignmentPortalResponse
import com.creapolis.solennix.core.model.ExecutionChecklist
import com.creapolis.solennix.core.model.TeamMemberAssignment
import com.creapolis.solennix.core.model.TeamMemberChangeEvent
import com.creapolis.solennix.core.model.UnavailableDate
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject

/** Load readiness for a single assignment's execution checklist (#1003). */
enum class ExecutionLoadState {
    IDLE,
    LOADING,
    READY,
    FAILED
}

data class TeamMemberPortalUiState(
    val assignments: List<TeamMemberAssignment> = emptyList(),
    val timeline: List<TeamMemberChangeEvent> = emptyList(),
    val unavailableDates: List<UnavailableDate> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isSavingAvailability: Boolean = false,
    val respondingAssignmentIds: Set<String> = emptySet(),
    val markingTimelineReadIds: Set<String> = emptySet(),
    val executionStates: Map<String, AssignmentExecutionState> = emptyMap(),
    val executionLoadStates: Map<String, ExecutionLoadState> = emptyMap(),
    /** True only after a successful server GET (or server-acked migrate PUT). */
    val executionServerSeeded: Map<String, Boolean> = emptyMap(),
    val lastSyncedExecutionStates: Map<String, AssignmentExecutionState> = emptyMap(),
    val executionErrorMessages: Map<String, String?> = emptyMap(),
    val errorMessage: String? = null
)

@HiltViewModel
class TeamMemberPortalViewModel @Inject constructor(
    private val staffRepository: StaffRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TeamMemberPortalUiState(isLoading = true))
    val uiState: StateFlow<TeamMemberPortalUiState> = _uiState.asStateFlow()

    /** Serializes full-state PUTs per assignment so rapid toggles cannot last-writer-lose. */
    private val putMutexes = java.util.concurrent.ConcurrentHashMap<String, kotlinx.coroutines.sync.Mutex>()

    init {
        refresh()
    }

    private fun putMutex(eventStaffId: String): kotlinx.coroutines.sync.Mutex =
        putMutexes.getOrPut(eventStaffId) { kotlinx.coroutines.sync.Mutex() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, errorMessage = null)
            try {
                val assignments = staffRepository.getMyAssignments()
                val timeline = staffRepository.getMyTimeline(unreadOnly = false, limit = 8)
                val (start, end) = availabilityBounds()
                val unavailableDates = staffRepository.getMyUnavailableDates(start, end)
                _uiState.value = _uiState.value.copy(
                    assignments = assignments,
                    timeline = timeline,
                    unavailableDates = unavailableDates,
                    isLoading = false,
                    isRefreshing = false,
                    errorMessage = null
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    errorMessage = "No pudimos cargar tus asignaciones."
                )
            }
        }
    }

    fun respond(assignment: TeamMemberAssignment, response: AssignmentPortalResponse) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                respondingAssignmentIds = _uiState.value.respondingAssignmentIds + assignment.eventStaffId,
                errorMessage = null
            )
            try {
                val outcome = staffRepository.respondAssignment(assignment.eventStaffId, response)
                val updatedAssignments = _uiState.value.assignments.mapNotNull { item ->
                    when {
                        item.eventStaffId != assignment.eventStaffId -> item
                        outcome.finalStatus.lowercase() == "confirmed" -> item.copy(status = "confirmed")
                        outcome.finalStatus.lowercase() == "declined" -> item.copy(status = "declined")
                        outcome.finalStatus.lowercase() == "cancelled" -> item.copy(status = "cancelled")
                        else -> null
                    }
                }
                val timeline = staffRepository.getMyTimeline(unreadOnly = false, limit = 8)
                _uiState.value = _uiState.value.copy(assignments = updatedAssignments, timeline = timeline)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = "No pudimos actualizar tu respuesta."
                )
            } finally {
                _uiState.value = _uiState.value.copy(
                    respondingAssignmentIds = _uiState.value.respondingAssignmentIds - assignment.eventStaffId
                )
            }
        }
    }

    fun markTimelineRead(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                markingTimelineReadIds = _uiState.value.markingTimelineReadIds + id,
                errorMessage = null
            )
            try {
                staffRepository.markMyTimelineRead(listOf(id))
                _uiState.value = _uiState.value.copy(
                    timeline = _uiState.value.timeline.map {
                        if (it.id == id) it.copy(readAt = java.time.Instant.now().toString()) else it
                    }
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = "No pudimos actualizar el estado de lectura."
                )
            } finally {
                _uiState.value = _uiState.value.copy(
                    markingTimelineReadIds = _uiState.value.markingTimelineReadIds - id
                )
            }
        }
    }

    // ── Execution state (#875 / harden #1003, parity with iOS #1001) ──

    /**
     * Loads server execution state when the detail dialog opens.
     *
     * Invariants (Judgment Day / iOS #1001):
     * - GET first; never PUT legacy without reading server when network allows
     * - Delete legacy only after server-acked PUT (via [onLegacyCleared])
     * - No sticky empty DEFAULT on GET fail — leave unset or offline-seed only
     * - Merge non-default server + legacy (OR checklist, richer note)
     * - Short-circuit only when already server-seeded ready
     *
     * @param onLegacyCleared called with [TeamMemberAssignment.eventId] only after
     *   a successful migrate/merge PUT so the Screen can drop prefs for that event only.
     */
    fun loadExecutionState(
        assignment: TeamMemberAssignment,
        legacyPrefs: LegacyExecutionState? = null,
        onLegacyCleared: ((eventId: String) -> Unit)? = null
    ) {
        val id = assignment.eventStaffId
        val state = _uiState.value
        if (state.executionServerSeeded[id] == true &&
            state.executionLoadStates[id] == ExecutionLoadState.READY
        ) {
            return
        }

        viewModelScope.launch {
            val softRevalidate = state.executionLoadStates[id] == ExecutionLoadState.READY &&
                state.executionServerSeeded[id] != true &&
                state.executionStates.containsKey(id)

            if (!softRevalidate) {
                _uiState.value = _uiState.value.copy(
                    executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.LOADING),
                    executionErrorMessages = _uiState.value.executionErrorMessages + (id to null)
                )
            }

            val legacyState = legacyPrefs?.toExecutionState()?.takeUnless { it.isDefault }

            try {
                val serverState = staffRepository.getExecutionState(id)

                // Soft revalidate with live key: live is full-state authority (no OR-merge).
                if (softRevalidate && _uiState.value.executionStates.containsKey(id)) {
                    val live = _uiState.value.executionStates[id]!!
                    if (live == serverState) {
                        markServerSeededReady(id, serverState)
                        if (legacyState != null) onLegacyCleared?.invoke(assignment.eventId)
                        return@launch
                    }
                    applyLocalExecutionState(id, live)
                    val acked = putExecutionStateSerialized(assignment, live)
                    if (acked) {
                        markServerSeededReady(id, live)
                        onLegacyCleared?.invoke(assignment.eventId)
                    } else {
                        // Keep live; mark seeded so UI stays editable with honest lastSynced=server.
                        _uiState.value = _uiState.value.copy(
                            lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates + (id to serverState),
                            executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.READY),
                            executionServerSeeded = _uiState.value.executionServerSeeded + (id to true)
                        )
                    }
                    return@launch
                }

                if (legacyState != null) {
                    if (serverState.isDefault) {
                        // Server empty + local progress → migrate via serial PUT.
                        applyLocalExecutionState(id, legacyState)
                        _uiState.value = _uiState.value.copy(
                            lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates +
                                (id to AssignmentExecutionState.DEFAULT),
                            executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.LOADING)
                        )
                        val acked = putExecutionStateSerialized(assignment, legacyState)
                        if (acked) {
                            markServerSeededReady(id, legacyState)
                            onLegacyCleared?.invoke(assignment.eventId)
                        } else {
                            // Keep legacy blob; stay failed so reopen retries.
                            _uiState.value = _uiState.value.copy(
                                executionStates = _uiState.value.executionStates - id,
                                lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates - id,
                                executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.FAILED),
                                executionServerSeeded = _uiState.value.executionServerSeeded + (id to false),
                                executionErrorMessages = _uiState.value.executionErrorMessages +
                                    (id to EXECUTION_SAVE_ERROR)
                            )
                        }
                        return@launch
                    }

                    val merged = mergeExecutionStates(serverState, legacyState)
                    applyLocalExecutionState(id, merged)
                    if (merged == serverState) {
                        markServerSeededReady(id, serverState)
                        onLegacyCleared?.invoke(assignment.eventId)
                        return@launch
                    }
                    _uiState.value = _uiState.value.copy(
                        lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates + (id to serverState),
                        executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.LOADING)
                    )
                    val acked = putExecutionStateSerialized(assignment, merged)
                    if (acked) {
                        markServerSeededReady(id, merged)
                        onLegacyCleared?.invoke(assignment.eventId)
                    } else {
                        // Keep merged local truth + legacy for retry (do not drop legacy).
                        applyLocalExecutionState(id, merged)
                        _uiState.value = _uiState.value.copy(
                            lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates + (id to serverState),
                            executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.READY),
                            executionServerSeeded = _uiState.value.executionServerSeeded + (id to true),
                            executionErrorMessages = _uiState.value.executionErrorMessages +
                                (id to EXECUTION_SAVE_ERROR)
                        )
                    }
                    return@launch
                }

                markServerSeededReady(id, serverState)
            } catch (_: Exception) {
                // Offline / GET fail: seed non-default legacy without auto-PUT; else failed (no sticky DEFAULT).
                if (legacyState != null) {
                    applyLocalExecutionState(id, legacyState)
                    _uiState.value = _uiState.value.copy(
                        lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates - id,
                        executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.READY),
                        executionServerSeeded = _uiState.value.executionServerSeeded + (id to false),
                        executionErrorMessages = _uiState.value.executionErrorMessages + (id to null)
                    )
                } else if (softRevalidate && _uiState.value.executionStates.containsKey(id)) {
                    // Keep live offline-ready cache; do not resurrect sticky DEFAULT.
                    _uiState.value = _uiState.value.copy(
                        executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.READY)
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        executionStates = _uiState.value.executionStates - id,
                        lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates - id,
                        executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.FAILED),
                        executionServerSeeded = _uiState.value.executionServerSeeded + (id to false),
                        executionErrorMessages = _uiState.value.executionErrorMessages +
                            (id to EXECUTION_LOAD_ERROR)
                    )
                }
            }
        }
    }

    /**
     * Applies local checklist edits and persists with a per-assignment serial mutex.
     * Gated until load state is [ExecutionLoadState.READY].
     */
    fun putExecutionState(assignment: TeamMemberAssignment, state: AssignmentExecutionState) {
        val id = assignment.eventStaffId
        if (_uiState.value.executionLoadStates[id] != ExecutionLoadState.READY) return

        viewModelScope.launch {
            val previous = _uiState.value.lastSyncedExecutionStates[id]
            applyLocalExecutionState(id, state)
            val acked = putExecutionStateSerialized(assignment, state)
            if (!acked) {
                // Roll memory back only when we have a lastSynced baseline.
                if (previous != null &&
                    _uiState.value.executionStates[id] == state
                ) {
                    applyLocalExecutionState(id, previous)
                }
                _uiState.value = _uiState.value.copy(
                    executionErrorMessages = _uiState.value.executionErrorMessages +
                        (id to EXECUTION_SAVE_ERROR)
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates + (id to state),
                    executionErrorMessages = _uiState.value.executionErrorMessages + (id to null)
                )
            }
        }
    }

    fun clearExecutionError(eventStaffId: String) {
        _uiState.value = _uiState.value.copy(
            executionErrorMessages = _uiState.value.executionErrorMessages + (eventStaffId to null)
        )
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    private fun applyLocalExecutionState(id: String, state: AssignmentExecutionState) {
        var next = state
        if (next.quickNote.length > MAX_QUICK_NOTE_LENGTH) {
            next = next.copy(quickNote = next.quickNote.take(MAX_QUICK_NOTE_LENGTH))
            _uiState.value = _uiState.value.copy(
                executionErrorMessages = _uiState.value.executionErrorMessages +
                    (id to EXECUTION_NOTE_TOO_LONG)
            )
        }
        _uiState.value = _uiState.value.copy(
            executionStates = _uiState.value.executionStates + (id to next)
        )
    }

    private fun markServerSeededReady(id: String, state: AssignmentExecutionState) {
        _uiState.value = _uiState.value.copy(
            executionStates = _uiState.value.executionStates + (id to state),
            lastSyncedExecutionStates = _uiState.value.lastSyncedExecutionStates + (id to state),
            executionLoadStates = _uiState.value.executionLoadStates + (id to ExecutionLoadState.READY),
            executionServerSeeded = _uiState.value.executionServerSeeded + (id to true),
            executionErrorMessages = _uiState.value.executionErrorMessages + (id to null)
        )
    }

    /** @return true when PUT completed without throwing (server ack). */
    private suspend fun putExecutionStateSerialized(
        assignment: TeamMemberAssignment,
        state: AssignmentExecutionState
    ): Boolean {
        val id = assignment.eventStaffId
        return putMutex(id).withLock {
            try {
                staffRepository.putExecutionState(id, state)
                true
            } catch (_: Exception) {
                false
            }
        }
    }

    /** Shape legacy for SharedPreferences migration (pre-#875). */
    data class LegacyExecutionState(
        val arrival: Boolean = false,
        val materials: Boolean = false,
        val closing: Boolean = false,
        val quickNote: String = ""
    ) {
        fun toExecutionState(): AssignmentExecutionState = AssignmentExecutionState(
            checklist = ExecutionChecklist(
                arrival = arrival,
                materials = materials,
                closing = closing
            ),
            quickNote = quickNote
        )
    }

    companion object {
        const val MAX_QUICK_NOTE_LENGTH = 2000
        const val EXECUTION_LOAD_ERROR = "No pudimos cargar el checklist de ejecución."
        const val EXECUTION_SAVE_ERROR = "No pudimos guardar el checklist de ejecución."
        const val EXECUTION_NOTE_TOO_LONG = "La nota rápida no puede superar 2000 caracteres."

        /**
         * Cold-load merge: checklist OR; longer note wins; equal length prefers legacy
         * (local migration intent). Matches iOS #1001.
         */
        fun mergeExecutionStates(
            server: AssignmentExecutionState,
            legacy: AssignmentExecutionState
        ): AssignmentExecutionState {
            val checklist = ExecutionChecklist(
                arrival = server.checklist.arrival || legacy.checklist.arrival,
                materials = server.checklist.materials || legacy.checklist.materials,
                closing = server.checklist.closing || legacy.checklist.closing
            )
            val note = when {
                server.quickNote.isEmpty() -> legacy.quickNote
                legacy.quickNote.isEmpty() -> server.quickNote
                server.quickNote.length > legacy.quickNote.length -> server.quickNote
                legacy.quickNote.length > server.quickNote.length -> legacy.quickNote
                else -> legacy.quickNote // equal length, different or same → prefer legacy
            }
            return AssignmentExecutionState(checklist = checklist, quickNote = note)
        }
    }

    fun createUnavailableDate(
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingAvailability = true, errorMessage = null)
            try {
                staffRepository.createMyUnavailableDate(startDate, endDate, startTime, endTime, reason)
                val (start, end) = availabilityBounds()
                val unavailableDates = staffRepository.getMyUnavailableDates(start, end)
                _uiState.value = _uiState.value.copy(unavailableDates = unavailableDates)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "No pudimos bloquear fechas.")
            } finally {
                _uiState.value = _uiState.value.copy(isSavingAvailability = false)
            }
        }
    }

    fun updateUnavailableDate(
        id: String,
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingAvailability = true, errorMessage = null)
            try {
                staffRepository.updateMyUnavailableDate(id, startDate, endDate, startTime, endTime, reason)
                val (start, end) = availabilityBounds()
                val unavailableDates = staffRepository.getMyUnavailableDates(start, end)
                _uiState.value = _uiState.value.copy(unavailableDates = unavailableDates)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "No pudimos actualizar el bloqueo.")
            } finally {
                _uiState.value = _uiState.value.copy(isSavingAvailability = false)
            }
        }
    }

    fun deleteUnavailableDate(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingAvailability = true, errorMessage = null)
            try {
                staffRepository.deleteMyUnavailableDate(id)
                _uiState.value = _uiState.value.copy(
                    unavailableDates = _uiState.value.unavailableDates.filterNot { it.id == id }
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "No pudimos eliminar el bloqueo.")
            } finally {
                _uiState.value = _uiState.value.copy(isSavingAvailability = false)
            }
        }
    }

    private fun availabilityBounds(now: java.time.LocalDate = java.time.LocalDate.now()): Pair<String, String> {
        val year = now.year
        return "${year - 1}-01-01" to "${year + 1}-12-31"
    }
}

private val AssignmentExecutionState.isDefault: Boolean
    get() = this == AssignmentExecutionState.DEFAULT