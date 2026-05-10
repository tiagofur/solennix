package com.creapolis.solennix.feature.events.ui

import android.widget.Toast
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.formatQuantity
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import kotlinx.coroutines.launch

fun EventStaffScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit,
    onStaffClick: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_detail_staff_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_detail_back))
                    }
                }
            )
        }
    ) { padding ->
        val staff = uiState.staff

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (staff.isEmpty()) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        stringResource(R.string.events_detail_staff_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            } else {
                val totalFee = staff.sumOf { it.feeAmount ?: 0.0 }
                Surface(
                    shape = MaterialTheme.shapes.medium,
                    color = SolennixTheme.colors.primary.copy(alpha = 0.08f)
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                        Text(
                            stringResource(
                                if (staff.size == 1) R.string.events_detail_staff_count_one else R.string.events_detail_staff_count_other,
                                staff.size
                            ),
                            style = MaterialTheme.typography.titleSmall,
                            color = SolennixTheme.colors.primaryText,
                            fontWeight = FontWeight.SemiBold
                        )
                        if (totalFee > 0.0) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                stringResource(R.string.events_detail_staff_total_cost, totalFee.asMXN()),
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                    }
                }

                staff.forEach { assignment ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onStaffClick(assignment.staffId) },
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        assignment.staffName ?: stringResource(R.string.events_detail_staff_fallback),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    val role = assignment.roleOverride?.takeIf { it.isNotBlank() }
                                        ?: assignment.staffRoleLabel?.takeIf { it.isNotBlank() }
                                    if (!role.isNullOrBlank()) {
                                        Text(
                                            role,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.primary
                                        )
                                    }
                                }
                                assignment.feeAmount?.let { fee ->
                                    Surface(
                                        shape = MaterialTheme.shapes.small,
                                        color = SolennixTheme.colors.primary.copy(alpha = 0.12f)
                                    ) {
                                        Text(
                                            fee.asMXN(),
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = SolennixTheme.colors.primary
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                AssignmentStatusBadge(assignment.status)
                                val window = formatShiftWindow(assignment.shiftStart, assignment.shiftEnd)
                                if (window != null) {
                                    Text(
                                        window,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }
                            }

                            val contact = listOfNotNull(
                                assignment.staffPhone?.takeIf { it.isNotBlank() },
                                assignment.staffEmail?.takeIf { it.isNotBlank() }
                            ).joinToString(" · ")
                            if (contact.isNotBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    contact,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }

                            if (!assignment.notes.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    assignment.notes!!,
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

@Composable
private fun AssignmentStatusBadge(rawStatus: String?) {
    val status = AssignmentStatus.fromString(rawStatus)
    val (label, color) = when (status) {
        AssignmentStatus.PENDING -> stringResource(R.string.events_detail_staff_status_pending) to Color(0xFFB7791F)
        AssignmentStatus.CONFIRMED -> stringResource(R.string.events_detail_staff_status_confirmed) to Color(0xFF2F855A)
        AssignmentStatus.DECLINED -> stringResource(R.string.events_detail_staff_status_declined) to Color(0xFFC53030)
        AssignmentStatus.CANCELLED -> stringResource(R.string.events_detail_staff_status_cancelled) to Color(0xFF718096)
    }
    Surface(
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.15f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatShiftWindow(shiftStartIso: String?, shiftEndIso: String?): String? {
    if (shiftStartIso.isNullOrBlank() && shiftEndIso.isNullOrBlank()) return null
    val zone = java.time.ZoneId.systemDefault()
    val fmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
    val start = shiftStartIso?.let {
        runCatching { java.time.Instant.parse(it).atZone(zone).toLocalTime().format(fmt) }.getOrNull()
    }
    val end = shiftEndIso?.let {
        runCatching { java.time.Instant.parse(it).atZone(zone).toLocalTime().format(fmt) }.getOrNull()
    }
    return when {
        start != null && end != null -> "$start – $end"
        start != null -> "Desde $start"
        end != null -> "Hasta $end"
        else -> null
    }
}
