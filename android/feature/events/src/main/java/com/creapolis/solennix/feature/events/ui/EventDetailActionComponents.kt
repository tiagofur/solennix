package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.filled.PlaylistAddCheck
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.feature.events.R

@Composable
fun NavLinkCard(
    icon: ImageVector,
    label: String,
    tint: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = MaterialTheme.shapes.medium,
        color = tint.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = tint,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = SolennixTheme.colors.tertiaryText,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
fun ChecklistButton(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.AutoMirrored.Filled.PlaylistAddCheck,
        label = stringResource(R.string.events_detail_checklist_load),
        tint = SolennixTheme.colors.primary,
        onClick = onClick
    )
}

@Composable
fun ContractPreviewButton(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.AutoMirrored.Filled.Article,
        label = stringResource(R.string.events_detail_view_contract),
        tint = SolennixTheme.colors.info,
        onClick = onClick
    )
}

@Composable
fun ClientPortalCard(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.Default.Link,
        label = androidx.compose.ui.res.stringResource(R.string.events_client_portal_title),
        tint = SolennixTheme.colors.primary,
        onClick = onClick
    )
}

@Composable
fun StatusChangePill(
    currentStatus: EventStatus,
    onStatusChange: (EventStatus) -> Unit
) {
    val statusOptions = listOf(
        EventStatus.QUOTED to stringResource(R.string.events_list_status_quoted),
        EventStatus.CONFIRMED to stringResource(R.string.events_list_status_confirmed),
        EventStatus.COMPLETED to stringResource(R.string.events_list_status_completed),
        EventStatus.CANCELLED to stringResource(R.string.events_list_status_cancelled)
    )
    val currentLabel = statusOptions.firstOrNull { it.first == currentStatus }?.second
        ?: currentStatus.name
    val currentColor = statusColor(currentStatus)
    var expanded by remember { mutableStateOf(false) }

    Box {
        Surface(
            onClick = { expanded = true },
            shape = RoundedCornerShape(999.dp),
            color = currentColor.copy(alpha = 0.15f),
            contentColor = currentColor
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    currentLabel,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Icon(
                    Icons.Default.ArrowDropDown,
                    contentDescription = stringResource(R.string.events_detail_status_change_title),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            statusOptions.forEach { (status, label) ->
                val color = statusColor(status)
                val isSelected = status == currentStatus
                DropdownMenuItem(
                    text = {
                        Text(
                            label,
                            color = color,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                        )
                    },
                    onClick = {
                        expanded = false
                        if (!isSelected) onStatusChange(status)
                    },
                    trailingIcon = if (isSelected) {
                        {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = color,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    } else null
                )
            }
        }
    }
}

@Composable
fun statusColor(status: EventStatus): Color = when (status) {
    EventStatus.QUOTED -> SolennixTheme.colors.primary
    EventStatus.CONFIRMED -> SolennixTheme.colors.success
    EventStatus.COMPLETED -> SolennixTheme.colors.primary
    EventStatus.CANCELLED -> SolennixTheme.colors.error
}

