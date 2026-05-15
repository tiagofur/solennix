package com.creapolis.solennix.feature.staff.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.AssignmentPortalResponse
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.TeamMemberAssignment
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.staff.viewmodel.TeamMemberPortalViewModel
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamMemberPortalScreen(
    viewModel: TeamMemberPortalViewModel,
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
                title = { Text("Mis asignaciones") },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recargar")
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        coroutineScope.launch {
                            authManager.logout()
                        }
                    }) {
                        Icon(Icons.Default.Close, contentDescription = "Salir")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            when {
                uiState.isLoading && uiState.assignments.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SolennixTheme.colors.primary)
                    }
                }

                uiState.assignments.isEmpty() -> {
                    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.CalendarMonth,
                                contentDescription = null,
                                tint = SolennixTheme.colors.secondaryText
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "Todavia no tenes asignaciones",
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "Cuando te asignen a un evento, va a aparecer aca.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }

                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.assignments, key = { it.eventStaffId }) { assignment ->
                            TeamMemberAssignmentCard(
                                assignment = assignment,
                                isResponding = uiState.respondingAssignmentIds.contains(assignment.eventStaffId),
                                onAccept = { viewModel.respond(assignment, AssignmentPortalResponse.ACCEPT) },
                                onDecline = { viewModel.respond(assignment, AssignmentPortalResponse.DECLINE) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TeamMemberAssignmentCard(
    assignment: TeamMemberAssignment,
    isResponding: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    val status = AssignmentStatus.fromString(assignment.status)
    val isPending = status == AssignmentStatus.PENDING
    val moneyFormatter = remember { NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-MX")) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = assignment.eventName,
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = assignment.eventDate,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )

            if (!assignment.roleOverride.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Rol: ${assignment.roleOverride}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            if (assignment.feeAmount != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Pago: ${moneyFormatter.format(assignment.feeAmount)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.primary
                )
            }

            if (!assignment.notes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = assignment.notes.orEmpty(),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (isPending) {
                androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onDecline,
                        enabled = !isResponding,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Rechazar")
                    }
                    Button(
                        onClick = onAccept,
                        enabled = !isResponding,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Aceptar")
                    }
                }
            } else {
                Text(
                    text = when (status) {
                        AssignmentStatus.CONFIRMED -> "Confirmada"
                        AssignmentStatus.DECLINED -> "Rechazada"
                        AssignmentStatus.CANCELLED -> "Cancelada"
                        AssignmentStatus.PENDING -> "Pendiente"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
    }
}