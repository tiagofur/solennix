package com.creapolis.solennix.feature.staff.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixPullToRefreshBox
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStaff
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.staff.R
import com.creapolis.solennix.feature.staff.viewmodel.SecretaryPortalViewModel
import kotlinx.coroutines.launch

/**
 * Portal del Secretario (#1347 S2): estrictamente solo lectura.
 *
 * Replica el look de [TeamMemberPortalScreen]: mismo top bar, pull-to-refresh,
 * tarjetas y tipografías. Sin finanzas, sin clientes, sin mutaciones.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecretaryPortalScreen(
    viewModel: SecretaryPortalViewModel,
    authManager: AuthManager
) {
    val uiState = viewModel.uiState.collectAsStateWithLifecycle().value
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.secretary_portal_title)) },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.staff_portal_cd_refresh))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        coroutineScope.launch {
                            authManager.logout()
                        }
                    }) {
                        Icon(Icons.Default.Close, contentDescription = stringResource(R.string.staff_portal_cd_logout))
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        SolennixPullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            when {
                uiState.isLoading && uiState.upcomingEvents.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SolennixTheme.colors.primary)
                    }
                }

                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            SectionTitle(stringResource(R.string.secretary_portal_agenda))
                        }
                        if (uiState.upcomingEvents.isEmpty()) {
                            item {
                                SecretaryInfoCard(stringResource(R.string.secretary_portal_empty_agenda))
                            }
                        } else {
                            items(uiState.upcomingEvents, key = { it.id }) { event ->
                                SecretaryEventCard(
                                    event = event,
                                    selected = event.id == uiState.selectedEventId,
                                    onClick = {
                                        viewModel.selectEvent(
                                            if (event.id == uiState.selectedEventId) null else event.id
                                        )
                                    }
                                )
                            }
                        }

                        item {
                            SectionTitle(stringResource(R.string.secretary_portal_staffing))
                        }
                        when {
                            uiState.selectedEventId == null -> {
                                item {
                                    SecretaryInfoCard(stringResource(R.string.secretary_portal_select_event_hint))
                                }
                            }
                            uiState.isLoadingDetail -> {
                                item {
                                    Box(
                                        Modifier.fillMaxWidth().padding(24.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator(color = SolennixTheme.colors.primary)
                                    }
                                }
                            }
                            uiState.eventStaff.isEmpty() -> {
                                item {
                                    SecretaryInfoCard(stringResource(R.string.secretary_portal_empty_staff))
                                }
                            }
                            else -> {
                                uiState.attendanceSummary?.let { summary ->
                                    item {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            SummaryChip(
                                                stringResource(R.string.staff_portal_status_confirmed),
                                                summary.confirmed
                                            )
                                            SummaryChip(
                                                stringResource(R.string.staff_portal_status_pending),
                                                summary.pending
                                            )
                                            SummaryChip(
                                                stringResource(R.string.staff_portal_status_declined),
                                                summary.declined
                                            )
                                        }
                                    }
                                }
                                items(uiState.eventStaff, key = { it.id }) { assignment ->
                                    SecretaryStaffRow(assignment)
                                }
                            }
                        }

                        item {
                            SectionTitle(stringResource(R.string.secretary_portal_directory))
                        }
                        if (uiState.staffDirectory.isEmpty()) {
                            item {
                                SecretaryInfoCard(stringResource(R.string.secretary_portal_empty_directory))
                            }
                        } else {
                            items(uiState.staffDirectory, key = { it.id }) { staff ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = SolennixTheme.colors.card
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Default.Person,
                                            contentDescription = null,
                                            tint = SolennixTheme.colors.secondaryText
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column {
                                            Text(
                                                text = staff.name,
                                                style = MaterialTheme.typography.titleSmall,
                                                color = SolennixTheme.colors.primaryText,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            staff.roleLabel?.takeIf { it.isNotBlank() }?.let { role ->
                                                Text(
                                                    text = role,
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = SolennixTheme.colors.secondaryText
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall,
        color = SolennixTheme.colors.secondaryText,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun SecretaryInfoCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = SolennixTheme.colors.surface
        )
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText
        )
    }
}

@Composable
private fun SecretaryEventCard(
    event: Event,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) SolennixTheme.colors.surface else SolennixTheme.colors.card
        )
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.CalendarMonth,
                contentDescription = null,
                tint = SolennixTheme.colors.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.serviceType,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = event.eventDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
                event.location?.takeIf { it.isNotBlank() }?.let { location ->
                    Text(
                        text = location,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun SecretaryStaffRow(assignment: EventStaff) {
    val status = AssignmentStatus.fromString(assignment.status)
    val statusLabel = when (status) {
        AssignmentStatus.CONFIRMED -> stringResource(R.string.staff_portal_status_confirmed)
        AssignmentStatus.DECLINED -> stringResource(R.string.staff_portal_status_declined)
        AssignmentStatus.CANCELLED -> stringResource(R.string.staff_portal_status_cancelled)
        AssignmentStatus.PENDING -> stringResource(R.string.staff_portal_status_pending)
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = SolennixTheme.colors.card
        )
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Group,
                contentDescription = null,
                tint = SolennixTheme.colors.secondaryText
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = assignment.staffName ?: stringResource(R.string.staff_collaborator_fallback),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText,
                    fontWeight = FontWeight.SemiBold
                )
                assignment.staffRoleLabel?.takeIf { it.isNotBlank() }?.let { role ->
                    Text(
                        text = stringResource(R.string.staff_portal_role_value, role),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
            AssistChip(
                onClick = {},
                label = { Text(statusLabel) },
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = SolennixTheme.colors.surface,
                    labelColor = SolennixTheme.colors.secondaryText
                )
            )
        }
    }
}

@Composable
private fun SummaryChip(label: String, count: Int) {
    AssistChip(
        onClick = {},
        label = { Text("$label: $count") },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = SolennixTheme.colors.surface,
            labelColor = SolennixTheme.colors.secondaryText
        )
    )
}
