package com.creapolis.solennix.feature.staff.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
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
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.Phone
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.staff.R
import com.creapolis.solennix.feature.staff.viewmodel.StaffDetailViewModel

private fun isPendingInviteStatus(status: String?): Boolean {
    return when (status?.trim()?.lowercase()) {
        "pending", "active", "invited", "sent" -> true
        else -> false
    }
}

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
    val context = LocalContext.current
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showRevokeDialog by remember { mutableStateOf(false) }
    val hasPendingInvite = uiState.inviteUrl != null || isPendingInviteStatus(uiState.staff?.inviteStatus)

    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.staff_detail_title)) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.staff_cd_back))
                    }
                },
                actions = {
                    uiState.staff?.let { staff ->
                        IconButton(onClick = { onEditClick(staff.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = stringResource(R.string.staff_cd_edit))
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = stringResource(R.string.staff_cd_delete),
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
                                text = stringResource(R.string.staff_detail_contact_info_title),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            InfoRow(
                                icon = Icons.Default.Phone,
                                label = stringResource(R.string.staff_form_phone_label),
                                value = staff.phone.takeUnless { it.isNullOrBlank() } ?: stringResource(R.string.staff_detail_not_provided)
                            )
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                            InfoRow(
                                icon = Icons.Default.Email,
                                label = stringResource(R.string.staff_form_email_label),
                                value = staff.email.takeUnless { it.isNullOrBlank() } ?: stringResource(R.string.staff_detail_not_provided)
                            )
                            if (!staff.roleLabel.isNullOrBlank()) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                                InfoRow(
                                    icon = Icons.Default.Badge,
                                    label = stringResource(R.string.staff_detail_role_label),
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
                                        Icons.AutoMirrored.Filled.Notes,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.primary
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = stringResource(R.string.staff_notes_title),
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
                                    text = stringResource(R.string.staff_detail_email_notifications_title),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Text(
                                    text = if (staff.notificationEmailOptIn)
                                        stringResource(R.string.staff_detail_email_notifications_enabled)
                                    else
                                        stringResource(R.string.staff_detail_email_notifications_disabled),
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
                                    text = stringResource(R.string.staff_detail_invite_link_title),
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
                                        val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        clipboardManager.setPrimaryClip(
                                            ClipData.newPlainText("invite_url", uiState.inviteUrl.orEmpty())
                                        )
                                    }
                                ) {
                                    Icon(Icons.Default.ContentCopy, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(stringResource(R.string.staff_detail_copy_link))
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
                            Text(if (uiState.isRevoking) stringResource(R.string.staff_detail_revoking) else stringResource(R.string.staff_detail_revoke_invite))
                        }
                    } else if (isPendingInviteStatus(uiState.staff?.inviteStatus)) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = stringResource(R.string.staff_detail_pending_invite_title),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = stringResource(R.string.staff_detail_pending_invite_description),
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
                            Text(if (uiState.isRevoking) stringResource(R.string.staff_detail_revoking) else stringResource(R.string.staff_detail_revoke_invite))
                        }
                    }

                    if (!staff.invitedUserId.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = SolennixTheme.colors.success.copy(alpha = 0.12f)
                            ),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = stringResource(R.string.staff_detail_access_enabled_title),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = stringResource(R.string.staff_detail_access_enabled_description),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
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
                            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (uiState.isInviting) stringResource(R.string.staff_detail_inviting) else stringResource(R.string.staff_detail_invite_access))
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }

                if (showDeleteDialog) {
                    AlertDialog(
                        onDismissRequest = { showDeleteDialog = false },
                        title = { Text(stringResource(R.string.staff_detail_delete_title)) },
                        text = {
                            Text(
                                stringResource(R.string.staff_detail_delete_message)
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
                                Text(stringResource(R.string.staff_delete))
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showDeleteDialog = false }) {
                                Text(stringResource(R.string.staff_cancel))
                            }
                        }
                    )
                }

                if (showRevokeDialog) {
                    AlertDialog(
                        onDismissRequest = { showRevokeDialog = false },
                        title = { Text(stringResource(R.string.staff_detail_revoke_invite_title)) },
                        text = {
                            Text(stringResource(R.string.staff_detail_revoke_invite_message))
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
                                Text(stringResource(R.string.staff_detail_revoke))
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showRevokeDialog = false }) {
                                Text(stringResource(R.string.staff_cancel))
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
