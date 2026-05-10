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

private fun StaffPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val availableStaff by viewModel.availableStaff.collectAsStateWithLifecycle()
    val availability by viewModel.staffAvailability.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }

    val selectedIds = remember(viewModel.selectedStaff.size) {
        viewModel.selectedStaff.map { it.staffId }.toSet()
    }

    val filtered = remember(query, availableStaff, selectedIds) {
        availableStaff.filter { staff ->
            staff.id !in selectedIds && (
                query.isBlank() ||
                    staff.name.contains(query, ignoreCase = true) ||
                    (staff.roleLabel?.contains(query, ignoreCase = true) == true)
                )
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                stringResource(R.string.events_form_staff_select_collaborator),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(stringResource(R.string.events_form_staff_search_placeholder)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = MaterialTheme.shapes.medium
            )
            Spacer(modifier = Modifier.height(12.dp))

            if (filtered.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        if (availableStaff.isEmpty())
                            stringResource(R.string.events_form_staff_empty_picker_message)
                        else
                            stringResource(R.string.events_form_products_no_results),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(filtered, key = { it.id }) { staff ->
                        Card(
                            onClick = {
                                viewModel.addStaffAssignment(staff)
                                onDismiss()
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = SolennixTheme.colors.card
                            ),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        staff.name,
                                        style = MaterialTheme.typography.titleSmall,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    val subtitle = listOfNotNull(
                                        staff.roleLabel?.takeIf { it.isNotBlank() },
                                        staff.email?.takeIf { it.isNotBlank() }
                                    ).joinToString(" · ")
                                    if (subtitle.isNotBlank()) {
                                        Text(
                                            subtitle,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                }
                                if (availability[staff.id]?.isNotEmpty() == true) {
                                    Surface(
                                        shape = MaterialTheme.shapes.small,
                                        color = Color(0xFFB7791F).copy(alpha = 0.15f),
                                        modifier = Modifier.padding(end = 8.dp)
                                    ) {
                                        Text(
                                            stringResource(R.string.events_form_staff_busy),
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color(0xFFB7791F),
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = stringResource(R.string.events_form_staff_assign_a11y),
                                    tint = SolennixTheme.colors.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TeamPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val teams by viewModel.availableTeams.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                stringResource(R.string.events_form_staff_select_team),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                stringResource(R.string.events_form_staff_team_hint),
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )
            Spacer(modifier = Modifier.height(12.dp))

            when {
                viewModel.isLoadingTeams && teams.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                viewModel.teamsErrorMessage != null && teams.isEmpty() -> {
                    Text(
                        viewModel.teamsErrorMessage.orEmpty(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.error
                    )
                }
                teams.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            stringResource(R.string.events_form_staff_empty_teams_picker),
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                else -> {
                    LazyColumn(modifier = Modifier.fillMaxWidth()) {
                        items(teams, key = { it.id }) { team ->
                            Card(
                                onClick = {
                                    viewModel.addTeamAssignment(team.id) { added, skipped ->
                                        val msg = buildString {
                                            append(context.getString(R.string.events_form_staff_team_applied_prefix))
                                            append(
                                                when (added) {
                                                    0 -> context.getString(R.string.events_form_staff_team_applied_none)
                                                    1 -> context.getString(R.string.events_form_staff_team_applied_one)
                                                    else -> context.getString(R.string.events_form_staff_team_applied_many, added)
                                                }
                                            )
                                            if (skipped > 0) {
                                                append(context.getString(R.string.events_form_staff_team_skipped, skipped))
                                            }
                                        }
                                        scope.launch { snackbarHostState.showSnackbar(msg) }
                                    }
                                    onDismiss()
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = SolennixTheme.colors.card
                                ),
                                shape = MaterialTheme.shapes.medium
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.Group,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.primary
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            team.name,
                                            style = MaterialTheme.typography.titleSmall,
                                            color = SolennixTheme.colors.primaryText
                                        )
                                        team.roleLabel?.takeIf { it.isNotBlank() }?.let { label ->
                                            Text(
                                                label,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SolennixTheme.colors.primary
                                            )
                                        }
                                        val count = team.memberCount ?: team.members?.size ?: 0
                                        Text(
                                            when (count) {
                                                0 -> stringResource(R.string.events_form_staff_team_members_none)
                                                1 -> stringResource(R.string.events_form_staff_team_members_one)
                                                else -> stringResource(R.string.events_form_staff_team_members_many, count)
                                            },
                                            style = MaterialTheme.typography.labelSmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = stringResource(R.string.events_form_staff_apply_a11y),
                                        tint = SolennixTheme.colors.primary
                                    )
                                }
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            SnackbarHost(hostState = snackbarHostState)
        }
    }
}
