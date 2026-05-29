package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.designsystem.event.UiEvent
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.feature.events.R
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import java.time.ZoneId
import java.util.UUID

fun EventFormViewModel.loadStaffCatalog() {
    viewModelScope.launch {
        staffRepository.getStaff().collect { list ->
            internalAvailableStaff.value = list
        }
    }
    // Refresh remoto — non-fatal
    viewModelScope.launch {
        try {
            staffRepository.syncStaff()
        } catch (_: Exception) {
            // Staff may fail to sync — UI cae al cache
        }
    }
}

fun EventFormViewModel.addStaffAssignment(staff: Staff) {
    if (selectedStaff.any { it.staffId == staff.id }) return
    selectedStaff.add(
        SelectedStaffAssignment(
            staffId = staff.id,
            feeAmount = null,
            roleOverride = "",
            notes = "",
            staffName = staff.name,
            staffRoleLabel = staff.roleLabel,
            shiftStart = null,
            shiftEnd = null,
            status = AssignmentStatus.CONFIRMED.raw
        )
    )
}

/**
 * Setea el turno del colaborador para la fecha actual del evento. [startLocal]
 * y [endLocal] son `LocalTime`; se combinan con [eventDate] y se convierten
 * a ISO8601 UTC. Si [endLocal] es menor a [startLocal], se asume que el turno
 * cruza medianoche y se corre un día.
 */
fun EventFormViewModel.updateStaffShift(
    staffId: String,
    startLocal: java.time.LocalTime?,
    endLocal: java.time.LocalTime?
) {
    val index = selectedStaff.indexOfFirst { it.staffId == staffId }
    if (index < 0) return
    val zone = ZoneId.systemDefault()
    val startIso = startLocal?.let { t ->
        eventDate.atTime(t).atZone(zone).toInstant().toString()
    }
    val endIso = endLocal?.let { t ->
        val baseDate =
            if (startLocal != null && t.isBefore(startLocal)) eventDate.plusDays(1)
            else eventDate
        baseDate.atTime(t).atZone(zone).toInstant().toString()
    }
    selectedStaff[index] = selectedStaff[index].copy(
        shiftStart = startIso,
        shiftEnd = endIso
    )
}

/** Limpia el turno registrado para la asignación. */
fun EventFormViewModel.clearStaffShift(staffId: String) {
    val index = selectedStaff.indexOfFirst { it.staffId == staffId }
    if (index < 0) return
    selectedStaff[index] = selectedStaff[index].copy(shiftStart = null, shiftEnd = null)
}

fun EventFormViewModel.updateStaffStatus(staffId: String, status: AssignmentStatus) {
    val index = selectedStaff.indexOfFirst { it.staffId == staffId }
    if (index < 0) return
    selectedStaff[index] = selectedStaff[index].copy(status = status.raw)
}

/**
 * Dispara `GET /api/staff/availability?date=X` para [eventDate]. El resultado
 * se publica en [staffAvailability]. No-op si el fetch falla — la UI no
 * debe bloquear la asignación por no tener la señal de ocupación.
 */
fun EventFormViewModel.fetchStaffAvailability() {
    cancelAvailabilityJob()
    startAvailabilityJob(viewModelScope.launch {
        try {
            val list = staffRepository.getStaffAvailability(date = eventDate.toString())
            // Al editar, filtrar asignaciones del evento actual para no
            // marcar como "ocupado" a alguien que ya está en este mismo
            // evento.
            val currentId = eventId
            val map = list.associate { avail ->
                avail.staffId to avail.assignments.filter { it.eventId != currentId }
            }.filterValues { it.isNotEmpty() }
            internalStaffAvailability.value = map
        } catch (_: Exception) {
            // Silencioso: la UI puede vivir sin la señal.
        }
    })
}

fun EventFormViewModel.removeStaffAssignment(staffId: String) {
    selectedStaff.removeAll { it.staffId == staffId }
}

fun EventFormViewModel.updateStaffFee(staffId: String, fee: Double?) {
    val index = selectedStaff.indexOfFirst { it.staffId == staffId }
    if (index < 0) return
    selectedStaff[index] = selectedStaff[index].copy(feeAmount = fee)
}

fun EventFormViewModel.updateStaffRoleOverride(staffId: String, role: String) {
    val index = selectedStaff.indexOfFirst { it.staffId == staffId }
    if (index < 0) return
    selectedStaff[index] = selectedStaff[index].copy(roleOverride = role)
}

fun EventFormViewModel.updateStaffNotes(staffId: String, notes: String) {
    val index = selectedStaff.indexOfFirst { it.staffId == staffId }
    if (index < 0) return
    selectedStaff[index] = selectedStaff[index].copy(notes = notes)
}

// ===== Staff Teams (Ola 2) =====

/** Lista equipos del usuario para el picker. Refresca on-demand. */
fun EventFormViewModel.loadTeams() {
    viewModelScope.launch {
        isLoadingTeams = true
        teamsErrorMessage = null
        try {
            internalAvailableTeams.value = staffTeamRepository.listTeams()
                .sortedBy { it.name.lowercase() }
        } catch (e: Exception) {
            teamsErrorMessage = "No pudimos cargar los equipos: ${e.message}"
        } finally {
            isLoadingTeams = false
        }
    }
}

/**
 * Expande un equipo: trae su detalle (con miembros) y agrega los staff que
 * no estén ya asignados al evento. Preserva la lógica Ola 1 — cada miembro
 * queda como asignación independiente y el usuario puede ajustar fee /
 * turno / estado después.
 */
fun EventFormViewModel.addTeamAssignment(teamId: String, onDone: (added: Int, skipped: Int) -> Unit = { _, _ -> }) {
    viewModelScope.launch {
        try {
            val team = staffTeamRepository.getTeam(teamId)
            val catalog = internalAvailableStaff.value.associateBy { it.id }
            val currentIds = selectedStaff.map { it.staffId }.toSet()
            var added = 0
            var skipped = 0
            team.members.orEmpty().sortedBy { it.position }.forEach { member ->
                if (member.staffId in currentIds) {
                    skipped++
                    return@forEach
                }
                // Prefer the fresh staff from catalog; fall back to the snapshot
                // that came inside the team payload.
                val resolvedName = catalog[member.staffId]?.name
                    ?: member.staffName
                    ?: "Colaborador"
                val resolvedRole = catalog[member.staffId]?.roleLabel
                    ?: member.staffRoleLabel
                selectedStaff.add(
                    SelectedStaffAssignment(
                        staffId = member.staffId,
                        feeAmount = null,
                        roleOverride = "",
                        notes = "",
                        staffName = resolvedName,
                        staffRoleLabel = resolvedRole,
                        shiftStart = null,
                        shiftEnd = null,
                        status = AssignmentStatus.CONFIRMED.raw
                    )
                )
                added++
            }
            onDone(added, skipped)
        } catch (e: Exception) {
            teamsErrorMessage = appContext.getString(R.string.events_form_error_add_team, e.message.orEmpty())
            onDone(0, 0)
        }
    }
}

fun EventFormViewModel.expandStaffTeamForProduct(teamId: String) {
    viewModelScope.launch {
        try {
            val team = staffTeamRepository.getTeam(teamId)
            val catalog = internalAvailableStaff.value.associateBy { it.id }
            val currentIds = selectedStaff.map { it.staffId }.toMutableSet()
            team.members.orEmpty().sortedBy { it.position }.forEach { member ->
                if (member.staffId in currentIds) return@forEach
                val resolvedName = catalog[member.staffId]?.name
                    ?: member.staffName
                    ?: "Colaborador"
                val resolvedRole = catalog[member.staffId]?.roleLabel
                    ?: member.staffRoleLabel
                selectedStaff.add(
                    SelectedStaffAssignment(
                        staffId = member.staffId,
                        feeAmount = null,
                        roleOverride = "",
                        notes = "",
                        staffName = resolvedName,
                        staffRoleLabel = resolvedRole,
                        shiftStart = null,
                        shiftEnd = null,
                        status = AssignmentStatus.CONFIRMED.raw
                    )
                )
                currentIds.add(member.staffId)
            }
        } catch (e: Exception) {
            triggerErrorEvent("No pudimos expandir el equipo del producto: ${e.message}")
        }
    }
}
