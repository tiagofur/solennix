package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.SelectedStaffAssignment
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel
import kotlinx.coroutines.launch

private fun StaffAssignmentCard(
    assignment: SelectedStaffAssignment,
    defaultStart: String,
    defaultEnd: String,
    onFeeChange: (Double?) -> Unit,
    onRoleChange: (String) -> Unit,
    onNotesChange: (String) -> Unit,
    onShiftChange: (java.time.LocalTime?, java.time.LocalTime?) -> Unit,
    onShiftClear: () -> Unit,
    onStatusChange: (AssignmentStatus) -> Unit,
    onRemove: () -> Unit
) {
    var feeText by remember(assignment.staffId) {
        mutableStateOf(assignment.feeAmount?.let { "%.2f".format(it) } ?: "")
    }

    val currentStatus = remember(assignment.status) {
        AssignmentStatus.fromString(assignment.status)
    }
    var shiftExpanded by remember(assignment.staffId) {
        mutableStateOf(!assignment.shiftStart.isNullOrBlank() || !assignment.shiftEnd.isNullOrBlank())
    }
    val zone = java.time.ZoneId.systemDefault()
    val startLocalTime = remember(assignment.shiftStart) {
        assignment.shiftStart?.let {
            try {
                java.time.Instant.parse(it).atZone(zone).toLocalTime()
            } catch (_: Exception) {
                null
            }
        }
    }
    val endLocalTime = remember(assignment.shiftEnd) {
        assignment.shiftEnd?.let {
            try {
                java.time.Instant.parse(it).atZone(zone).toLocalTime()
            } catch (_: Exception) {
                null
            }
        }
    }
    val defaultStartLocal = remember(defaultStart) { parseHHmmOrNull(defaultStart) }
    val defaultEndLocal = remember(defaultEnd) { parseHHmmOrNull(defaultEnd) }

    var showStartPicker by remember { mutableStateOf(false) }
    var showEndPicker by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        assignment.staffName ?: stringResource(R.string.events_detail_staff_fallback),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primaryText
                    )
                    if (!assignment.staffRoleLabel.isNullOrBlank()) {
                        Text(
                            assignment.staffRoleLabel,
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.primary
                        )
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(R.string.events_form_staff_remove_a11y),
                        tint = SolennixTheme.colors.error
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AssignmentStatus.values().forEach { opt ->
                    FilterChip(
                        selected = opt == currentStatus,
                        onClick = { onStatusChange(opt) },
                        label = { Text(opt.uiLabel()) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = opt.uiColor().copy(alpha = 0.18f),
                            selectedLabelColor = opt.uiColor()
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            AdaptiveFormRow(
                left = {
                    OutlinedTextField(
                        value = feeText,
                        onValueChange = { newValue ->
                            feeText = newValue
                            onFeeChange(newValue.replace(",", ".").toDoubleOrNull())
                        },
                        label = { Text(stringResource(R.string.events_form_staff_fee_optional)) },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                        ),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        prefix = { Text("$") }
                    )
                },
                right = {
                    OutlinedTextField(
                        value = assignment.roleOverride,
                        onValueChange = onRoleChange,
                        label = { Text(stringResource(R.string.events_form_staff_role_optional)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = assignment.notes,
                onValueChange = onNotesChange,
                label = { Text(stringResource(R.string.events_form_staff_notes_optional)) },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(12.dp))

            TextButton(
                onClick = { shiftExpanded = !shiftExpanded },
                contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)
            ) {
                Icon(
                    if (shiftExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    if (shiftExpanded) stringResource(R.string.events_form_staff_shift_schedule) else stringResource(R.string.events_form_staff_shift_add),
                    style = MaterialTheme.typography.labelLarge
                )
            }

            if (shiftExpanded) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { showStartPicker = true },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            startLocalTime?.let { formatTime(it) } ?: stringResource(R.string.events_form_staff_shift_start)
                        )
                    }
                    OutlinedButton(
                        onClick = { showEndPicker = true },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            endLocalTime?.let { formatTime(it) } ?: stringResource(R.string.events_form_staff_shift_end)
                        )
                    }
                    if (startLocalTime != null || endLocalTime != null) {
                        IconButton(onClick = onShiftClear) {
                            Icon(
                                Icons.Default.Clear,
                                contentDescription = stringResource(R.string.events_form_staff_shift_clear_a11y),
                                tint = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
            }

            if (showStartPicker) {
                val pickerState = rememberTimePickerState(
                    initialHour = (startLocalTime ?: defaultStartLocal)?.hour ?: 14,
                    initialMinute = (startLocalTime ?: defaultStartLocal)?.minute ?: 0,
                    is24Hour = true
                )
                AlertDialog(
                    onDismissRequest = { showStartPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            val picked = java.time.LocalTime.of(pickerState.hour, pickerState.minute)
                            onShiftChange(picked, endLocalTime)
                            showStartPicker = false
                        }) { Text(stringResource(R.string.events_form_staff_done)) }
                    },
                    dismissButton = {
                        TextButton(onClick = { showStartPicker = false }) { Text(stringResource(R.string.events_form_cancel)) }
                    },
                    text = { TimePicker(state = pickerState) }
                )
            }
            if (showEndPicker) {
                val pickerState = rememberTimePickerState(
                    initialHour = (endLocalTime ?: defaultEndLocal)?.hour ?: 20,
                    initialMinute = (endLocalTime ?: defaultEndLocal)?.minute ?: 0,
                    is24Hour = true
                )
                AlertDialog(
                    onDismissRequest = { showEndPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            val picked = java.time.LocalTime.of(pickerState.hour, pickerState.minute)
                            onShiftChange(startLocalTime, picked)
                            showEndPicker = false
                        }) { Text(stringResource(R.string.events_form_staff_done)) }
                    },
                    dismissButton = {
                        TextButton(onClick = { showEndPicker = false }) { Text(stringResource(R.string.events_form_cancel)) }
                    },
                    text = { TimePicker(state = pickerState) }
                )
            }
        }
    }
}

private fun parseHHmmOrNull(hhmm: String): java.time.LocalTime? = try {
    java.time.LocalTime.parse(hhmm)
} catch (_: Exception) {
    null
}

private fun formatTime(time: java.time.LocalTime): String =
    time.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"))

@Composable
private fun AssignmentStatus.uiLabel(): String = when (this) {
    AssignmentStatus.PENDING -> stringResource(R.string.events_form_staff_status_pending)
    AssignmentStatus.CONFIRMED -> stringResource(R.string.events_form_staff_status_confirmed)
    AssignmentStatus.DECLINED -> stringResource(R.string.events_form_staff_status_declined)
    AssignmentStatus.CANCELLED -> stringResource(R.string.events_form_staff_status_cancelled)
}

private fun AssignmentStatus.uiColor(): Color = when (this) {
    AssignmentStatus.PENDING -> Color(0xFFB7791F)
    AssignmentStatus.CONFIRMED -> Color(0xFF2F855A)
    AssignmentStatus.DECLINED -> Color(0xFFC53030)
    AssignmentStatus.CANCELLED -> Color(0xFF718096)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
