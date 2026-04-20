package com.creapolis.solennix.feature.staff.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.StaffTeamMember
import com.creapolis.solennix.feature.staff.viewmodel.StaffTeamDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffTeamDetailScreen(
    viewModel: StaffTeamDetailViewModel,
    onNavigateBack: () -> Unit,
    onEditClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showDeleteDialog by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) onNavigateBack()
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Detalle del equipo") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    uiState.team?.let { team ->
                        IconButton(onClick = { onEditClick(team.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = "Editar")
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Eliminar",
                                tint = SolennixTheme.colors.error
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            uiState.errorMessage != null && uiState.team == null -> {
                Box(
                    Modifier.fillMaxSize().padding(padding).padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(uiState.errorMessage.orEmpty(), color = SolennixTheme.colors.error)
                }
            }
            uiState.team != null -> {
                val team = uiState.team ?: return@Scaffold
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(scrollState)
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Group,
                            contentDescription = null,
                            tint = SolennixTheme.colors.primary,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                team.name,
                                style = MaterialTheme.typography.headlineSmall,
                                color = SolennixTheme.colors.primaryText
                            )
                            team.roleLabel?.takeIf { it.isNotBlank() }?.let { label ->
                                Text(
                                    label,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    team.notes?.takeIf { it.isNotBlank() }?.let { notes ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Notes,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.primary
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "Notas",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    notes,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    Text(
                        "Miembros",
                        style = MaterialTheme.typography.titleMedium,
                        color = SolennixTheme.colors.primaryText,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    val sortedMembers = team.members.orEmpty().sortedBy { it.position }
                    if (sortedMembers.isEmpty()) {
                        Text(
                            "Este equipo aún no tiene miembros. Editá el equipo para agregar colaboradores.",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    } else {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column {
                                sortedMembers.forEachIndexed { idx, member ->
                                    TeamMemberRow(member = member)
                                    if (idx < sortedMembers.size - 1) {
                                        HorizontalDivider(
                                            modifier = Modifier.padding(horizontal = 16.dp),
                                            color = SolennixTheme.colors.divider.copy(alpha = 0.5f)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Eliminar equipo") },
            text = {
                Text(
                    "¿Eliminar este equipo? Los colaboradores que lo integran no se borran — " +
                        "sólo se deshace la agrupación."
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deleteTeam()
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = SolennixTheme.colors.error
                    )
                ) {
                    Text("Eliminar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
private fun TeamMemberRow(member: StaffTeamMember) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start
    ) {
        Avatar(name = member.staffName ?: "Colaborador", photoUrl = null, size = 40.dp)
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                member.staffName ?: "Colaborador",
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText
            )
            member.staffRoleLabel?.takeIf { it.isNotBlank() }?.let { role ->
                Text(
                    role,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.primary
                )
            }
        }
        if (member.isLead) {
            AssistChip(
                onClick = {},
                label = { Text("Lidera") },
                leadingIcon = {
                    Icon(
                        Icons.Default.Star,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.primary
                    )
                },
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = SolennixTheme.colors.primaryLight.copy(alpha = 0.35f),
                    labelColor = SolennixTheme.colors.primary
                )
            )
        }
    }
}
