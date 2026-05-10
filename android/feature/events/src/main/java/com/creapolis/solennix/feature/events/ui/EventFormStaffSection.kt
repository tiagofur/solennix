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

@Composable
fun StaffSection(viewModel: EventFormViewModel) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            stringResource(R.string.events_form_inventory_staff),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(12.dp))
        StaffAssignmentPanel(viewModel = viewModel)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StaffAssignmentPanel(viewModel: EventFormViewModel) {
    var showStaffPicker by remember { mutableStateOf(false) }
    var showTeamPicker by remember { mutableStateOf(false) }
    val availableStaff by viewModel.availableStaff.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.Group,
                contentDescription = null,
                tint = SolennixTheme.colors.primary
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                stringResource(R.string.events_form_staff_assigned_title),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = { showStaffPicker = true }) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = stringResource(R.string.events_form_staff_add_collaborator_a11y),
                    tint = SolennixTheme.colors.primary
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            stringResource(R.string.events_form_staff_helper),
            style = MaterialTheme.typography.bodySmall,
            color = SolennixTheme.colors.secondaryText
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (availableStaff.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = SolennixTheme.colors.primary.copy(alpha = 0.08f)
                ),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        stringResource(R.string.events_form_staff_empty_catalog_title),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.events_form_staff_empty_catalog_desc),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        } else if (viewModel.selectedStaff.isEmpty()) {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = { showStaffPicker = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.events_form_staff_add_collaborator))
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        viewModel.loadTeams()
                        showTeamPicker = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Group, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.events_form_staff_add_team))
                }
            }
        } else {
            viewModel.selectedStaff.forEach { assignment ->
                StaffAssignmentCard(
                    assignment = assignment,
                    defaultStart = viewModel.startTime,
                    defaultEnd = viewModel.endTime,
                    onFeeChange = { viewModel.updateStaffFee(assignment.staffId, it) },
                    onRoleChange = { viewModel.updateStaffRoleOverride(assignment.staffId, it) },
                    onNotesChange = { viewModel.updateStaffNotes(assignment.staffId, it) },
                    onShiftChange = { start, end ->
                        viewModel.updateStaffShift(assignment.staffId, start, end)
                    },
                    onShiftClear = { viewModel.clearStaffShift(assignment.staffId) },
                    onStatusChange = { viewModel.updateStaffStatus(assignment.staffId, it) },
                    onRemove = { viewModel.removeStaffAssignment(assignment.staffId) }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (viewModel.costStaff > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    stringResource(R.string.events_form_staff_total_cost, viewModel.costStaff.asMXN()),
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.primary
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = {
                    viewModel.loadTeams()
                    showTeamPicker = true
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Group, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.events_form_staff_add_team))
            }
        }
    }

    if (showStaffPicker) {
        StaffPickerSheet(
            viewModel = viewModel,
            onDismiss = { showStaffPicker = false }
        )
    }

    if (showTeamPicker) {
        TeamPickerSheet(
            viewModel = viewModel,
            onDismiss = { showTeamPicker = false }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
