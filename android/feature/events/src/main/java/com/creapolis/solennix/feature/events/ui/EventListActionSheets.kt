package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventSortField

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SortBottomSheet(
    activeField: EventSortField,
    ascending: Boolean,
    onPick: (EventSortField) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val options = listOf(
        EventSortField.EVENT_DATE to R.string.events_list_sort_date,
        EventSortField.SERVICE_TYPE to R.string.events_list_sort_service,
        EventSortField.CLIENT_NAME to R.string.events_list_sort_client,
        EventSortField.TOTAL_AMOUNT to R.string.events_list_sort_total
    )
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            Text(
                stringResource(R.string.events_list_sort_by),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText
            )
            Spacer(modifier = Modifier.height(12.dp))
            options.forEach { (field, labelRes) ->
                val isActive = field == activeField
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPick(field) }
                        .padding(vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        stringResource(labelRes),
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (isActive) SolennixTheme.colors.primary
                        else SolennixTheme.colors.primaryText,
                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal
                    )
                    if (isActive) {
                        Icon(
                            if (ascending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                            contentDescription = stringResource(if (ascending) R.string.events_list_sort_ascending else R.string.events_list_sort_descending),
                            tint = SolennixTheme.colors.primary
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RowActionsBottomSheet(
    event: Event,
    clientName: String?,
    onEdit: () -> Unit,
    onChangeStatus: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
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
                    clientName ?: stringResource(R.string.events_list_client_fallback),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    event.serviceType,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    maxLines = 1
                )
            }
            HorizontalDivider(color = SolennixTheme.colors.divider)

            RowActionItem(icon = Icons.Default.Edit, label = stringResource(R.string.events_list_action_edit), onClick = onEdit)
            RowActionItem(
                icon = Icons.Default.SwapVert,
                label = stringResource(R.string.events_list_action_change_status),
                onClick = onChangeStatus
            )
            RowActionItem(
                icon = Icons.Default.Delete,
                label = stringResource(R.string.events_list_action_delete),
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatusChangeBottomSheet(
    event: Event,
    onPick: (EventStatus) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val options = listOf(
        EventStatus.QUOTED to R.string.events_list_status_quoted,
        EventStatus.CONFIRMED to R.string.events_list_status_confirmed,
        EventStatus.COMPLETED to R.string.events_list_status_completed,
        EventStatus.CANCELLED to R.string.events_list_status_cancelled
    )
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            Text(
                stringResource(R.string.events_list_status_change_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText
            )
            Spacer(modifier = Modifier.height(12.dp))
            options.forEach { (status, labelRes) ->
                val isActive = status == event.status
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPick(status) }
                        .padding(vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        stringResource(labelRes),
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (isActive) SolennixTheme.colors.primary
                        else SolennixTheme.colors.primaryText,
                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal
                    )
                    if (isActive) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = SolennixTheme.colors.primary
                        )
                    }
                }
            }
        }
    }
}