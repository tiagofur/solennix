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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.staff.viewmodel.StaffDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffDetailScreen(
    viewModel: StaffDetailViewModel,
    onNavigateBack: () -> Unit,
    onEditClick: (String) -> Unit,
    onSearchClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val clipboard = LocalClipboardManager.current
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showRevokeDialog by remember { mutableStateOf(false) }
    val hasPendingInvite = uiState.inviteUrl != null || uiState.staff?.inviteStatus == "pending"

    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Detalle del colaborador") },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    uiState.staff?.let { staff ->
                        IconButton(onClick = { onEditClick(staff.id) }) {
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
            uiState.errorMessage != null -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Text(uiState.errorMessage.orEmpty(), color = SolennixTheme.colors.error)
                }
            }
            uiState.staff != null -> {
                val staff = uiState.staff ?: return@Scaffold
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(scrollState)
                        .padding(16.dp)
                ) {
                    // Header
                    val isWide = LocalIsWideScreen.current
                    if (isWide) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Avatar(name = staff.name, photoUrl = null, size = 80.dp)
                            Spacer(modifier = Modifier.width(20.dp))
                            Column {
                                Text(
                                    text = staff.name,
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = SolennixTheme.colors.primaryText
                                )
                                if (!staff.roleLabel.isNullOrBlank()) {
                                    Text(
                                        text = staff.roleLabel!!,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = SolennixTheme.colors.primary
                                    )
                                }
                            }
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Avatar(name = staff.name, photoUrl = null, size = 100.dp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = staff.name,
                                style = MaterialTheme.typography.headlineMedium,
                                color = SolennixTheme.colors.primaryText
                            )
                            if (!staff.roleLabel.isNullOrBlank()) {
                                Text(
                                    text = staff.roleLabel!!,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Contact info
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                text = "Información de contacto",
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            InfoRow(
                                icon = Icons.Default.Phone,
                                label = "Teléfono",
                                value = staff.phone.takeUnless { it.isNullOrBlank() } ?: "No proporcionado"
                            )
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                            InfoRow(
                                icon = Icons.Default.Email,
                                label = "Email",
                                value = staff.email.takeUnless { it.isNullOrBlank() } ?: "No proporcionado"
                            )
                            if (!staff.roleLabel.isNullOrBlank()) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                                InfoRow(
                                    icon = Icons.Default.Badge,
                                    label = "Rol",
                                    value = staff.roleLabel!!
                                )
                            }
                        }
                    }

                    if (!staff.notes.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Notes,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.primary
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Notas",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = staff.notes!!,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Phase 2 notification preference indicator
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = SolennixTheme.colors.primaryLight.copy(alpha = 0.25f)
                        ),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.MailOutline,
                                contentDescription = null,
                                tint = SolennixTheme.colors.primary
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Notificaciones por email",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Text(
                                    text = if (staff.notificationEmailOptIn)
                                        "Activadas — se activarán automáticamente en Phase 2 (Pro+)"
                                    else
                                        "Desactivadas",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    if (!uiState.inviteUrl.isNullOrBlank()) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Link de invitación",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = uiState.inviteUrl.orEmpty(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                TextButton(
                                    onClick = {
                                        clipboard.setText(AnnotatedString(uiState.inviteUrl.orEmpty()))
                                    }
                                ) {
                                    Icon(Icons.Default.ContentCopy, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Copiar link")
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        TextButton(
                            onClick = { showRevokeDialog = true },
                            enabled = !uiState.isInviting && !uiState.isRevoking,
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = SolennixTheme.colors.error
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(if (uiState.isRevoking) "Revocando..." else "Revocar invitación")
                        }
                    } else if (uiState.staff?.inviteStatus == "pending") {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Invitación activa pendiente",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "La invitación sigue activa. Puedes revocarla para invalidar el enlace.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        TextButton(
                            onClick = { showRevokeDialog = true },
                            enabled = !uiState.isInviting && !uiState.isRevoking,
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = SolennixTheme.colors.error
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(if (uiState.isRevoking) "Revocando..." else "Revocar invitación")
                        }
                    }

                    if (!uiState.inviteFeedback.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = uiState.inviteFeedback.orEmpty(),
                            style = MaterialTheme.typography.bodySmall,
                            color = if (uiState.inviteFeedbackIsError) SolennixTheme.colors.error else SolennixTheme.colors.success
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    if (!staff.email.isNullOrBlank() && staff.invitedUserId.isNullOrBlank() && !hasPendingInvite) {
                        TextButton(
                            onClick = { viewModel.inviteAccess() },
                            enabled = !uiState.isInviting,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Send, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (uiState.isInviting) "Invitando..." else "Invitar acceso")
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }

                if (showDeleteDialog) {
                    AlertDialog(
                        onDismissRequest = { showDeleteDialog = false },
                        title = { Text("Eliminar colaborador") },
                        text = {
                            Text(
                                "¿Eliminar este colaborador? Las asignaciones previas a eventos " +
                                    "no se borran, pero ya no vas a poder asignarlo a eventos nuevos."
                            )
                        },
                        confirmButton = {
                            TextButton(
                                onClick = {
                                    showDeleteDialog = false
                                    viewModel.deleteStaff()
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

                if (showRevokeDialog) {
                    AlertDialog(
                        onDismissRequest = { showRevokeDialog = false },
                        title = { Text("Revocar invitación") },
                        text = {
                            Text("La invitación quedará desactivada y el enlace dejará de funcionar.")
                        },
                        confirmButton = {
                            TextButton(
                                onClick = {
                                    showRevokeDialog = false
                                    viewModel.revokeInviteAccess()
                                },
                                colors = ButtonDefaults.textButtonColors(
                                    contentColor = SolennixTheme.colors.error
                                )
                            ) {
                                Text("Revocar")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showRevokeDialog = false }) {
                                Text("Cancelar")
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = SolennixTheme.colors.primary)
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                color = SolennixTheme.colors.primaryText
            )
        }
    }
}
