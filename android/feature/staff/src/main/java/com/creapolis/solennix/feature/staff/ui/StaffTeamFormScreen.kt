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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.staff.viewmodel.SelectedTeamMember
import com.creapolis.solennix.feature.staff.viewmodel.StaffTeamFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffTeamFormScreen(
    viewModel: StaffTeamFormViewModel,
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    var showMemberPicker by remember { mutableStateOf(false) }

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) onNavigateBack()
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = {
                    Text(if (viewModel.isEditMode) "Editar equipo" else "Crear equipo")
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(16.dp)
            ) {
                SolennixTextField(
                    value = viewModel.name,
                    onValueChange = { viewModel.name = it },
                    label = "Nombre *",
                    leadingIcon = Icons.Default.Group,
                    errorMessage = viewModel.nameError
                )
                Spacer(modifier = Modifier.height(16.dp))
                SolennixTextField(
                    value = viewModel.roleLabel,
                    onValueChange = { viewModel.roleLabel = it },
                    label = "Rol del equipo (ej. Banquetes, Producción)",
                    leadingIcon = Icons.Default.Badge
                )
                Spacer(modifier = Modifier.height(16.dp))
                SolennixTextField(
                    value = viewModel.notes,
                    onValueChange = { viewModel.notes = it },
                    label = "Notas",
                    leadingIcon = Icons.Default.Notes
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Miembros",
                        style = MaterialTheme.typography.titleMedium,
                        color = SolennixTheme.colors.primaryText,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "${viewModel.members.size}",
                        style = MaterialTheme.typography.labelMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))

                if (viewModel.members.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = SolennixTheme.colors.primary.copy(alpha = 0.08f)
                        ),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "Aún no agregaste miembros.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Seleccioná colaboradores de tu catálogo para armar el equipo.",
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                } else {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Column {
                            viewModel.members.forEachIndexed { idx, member ->
                                MemberFormRow(
                                    member = member,
                                    onToggleLead = { viewModel.toggleLead(member.staffId) },
                                    onRemove = { viewModel.removeMember(member.staffId) }
                                )
                                if (idx < viewModel.members.size - 1) {
                                    HorizontalDivider(
                                        modifier = Modifier.padding(horizontal = 16.dp),
                                        color = SolennixTheme.colors.divider.copy(alpha = 0.5f)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(
                    onClick = { showMemberPicker = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Agregar miembro")
                }

                Spacer(modifier = Modifier.height(24.dp))

                if (viewModel.errorMessage != null) {
                    Text(
                        text = viewModel.errorMessage.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                PremiumButton(
                    text = if (viewModel.isEditMode) "Guardar cambios" else "Crear equipo",
                    onClick = { viewModel.saveTeam() },
                    isLoading = viewModel.isSaving,
                    enabled = !viewModel.isSaving
                )

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    if (showMemberPicker) {
        MemberPickerSheet(
            viewModel = viewModel,
            onDismiss = { showMemberPicker = false }
        )
    }
}

@Composable
private fun MemberFormRow(
    member: SelectedTeamMember,
    onToggleLead: () -> Unit,
    onRemove: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start
    ) {
        Icon(
            Icons.Default.Person,
            contentDescription = null,
            tint = SolennixTheme.colors.primary,
            modifier = Modifier.size(28.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                member.staffName,
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText
            )
            if (!member.staffRoleLabel.isNullOrBlank()) {
                Text(
                    member.staffRoleLabel,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.primary
                )
            }
        }
        IconButton(onClick = onToggleLead) {
            Icon(
                if (member.isLead) Icons.Default.Star else Icons.Default.StarBorder,
                contentDescription = if (member.isLead) "Quitar como líder" else "Marcar como líder",
                tint = if (member.isLead) SolennixTheme.colors.primary else SolennixTheme.colors.secondaryText
            )
        }
        IconButton(onClick = onRemove) {
            Icon(
                Icons.Default.Close,
                contentDescription = "Quitar del equipo",
                tint = SolennixTheme.colors.error
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MemberPickerSheet(
    viewModel: StaffTeamFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val available by viewModel.availableStaff.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }

    val selectedIds = remember(viewModel.members.size) {
        viewModel.members.map { it.staffId }.toSet()
    }
    val filtered = remember(query, available, selectedIds) {
        available.filter { staff ->
            staff.id !in selectedIds && (
                query.isBlank() ||
                    staff.name.contains(query, ignoreCase = true) ||
                    (staff.roleLabel?.contains(query, ignoreCase = true) == true)
                )
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Agregar miembro",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Buscar por nombre o rol...") },
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
                        if (available.isEmpty())
                            "Aún no tenés colaboradores. Agregalos desde Más → Personal."
                        else
                            "Sin resultados",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(filtered, key = { it.id }) { staff ->
                        Card(
                            onClick = {
                                viewModel.addMember(staff)
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
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "Agregar",
                                    tint = SolennixTheme.colors.primary
                                )
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
