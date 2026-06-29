package com.creapolis.solennix.feature.clients.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import com.creapolis.solennix.core.designsystem.util.shouldSkipPartiallyExpanded
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.feature.clients.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientRowActionsBottomSheet(
    client: Client,
    onEdit: () -> Unit,
    onCall: () -> Unit,
    onEmail: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = shouldSkipPartiallyExpanded())
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 32.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(
                    client.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (!client.phone.isNullOrBlank()) {
                    Text(
                        client.phone,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        maxLines = 1
                    )
                }
            }
            HorizontalDivider(color = SolennixTheme.colors.divider)

            RowActionItem(
                icon = Icons.Default.Edit,
                label = stringResource(R.string.clients_list_action_edit),
                onClick = onEdit
            )
            if (!client.phone.isNullOrBlank()) {
                RowActionItem(
                    icon = Icons.Default.Phone,
                    label = stringResource(R.string.clients_list_action_call),
                    onClick = onCall
                )
            }
            if (!client.email.isNullOrBlank()) {
                RowActionItem(
                    icon = Icons.Default.Email,
                    label = stringResource(R.string.clients_list_action_email),
                    onClick = onEmail
                )
            }
            RowActionItem(
                icon = Icons.Default.Delete,
                label = stringResource(R.string.clients_list_action_delete),
                destructive = true,
                onClick = onDelete
            )
        }
    }
}

@Composable
private fun RowActionItem(
    icon: ImageVector,
    label: String,
    destructive: Boolean = false,
    onClick: () -> Unit
) {
    val tint = if (destructive) SolennixTheme.colors.error else SolennixTheme.colors.primaryText
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = tint)
        Spacer(modifier = Modifier.width(16.dp))
        Text(label, style = MaterialTheme.typography.bodyLarge, color = tint)
    }
}
