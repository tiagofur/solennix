package com.creapolis.solennix.feature.staff.ui

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.feature.staff.R
import com.creapolis.solennix.feature.staff.viewmodel.StaffListViewModel
import com.creapolis.solennix.feature.staff.viewmodel.StaffSortOption

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffListScreen(
    viewModel: StaffListViewModel,
    onStaffClick: (String) -> Unit,
    onStaffEdit: (String) -> Unit,
    onAddStaffClick: () -> Unit,
    onSearchClick: () -> Unit = {},
    onTeamsClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    var rowActionsStaff by remember { mutableStateOf<Staff?>(null) }
    var deleteConfirmStaff by remember { mutableStateOf<Staff?>(null) }

    LifecycleResumeEffect(viewModel) {
        viewModel.refresh()
        onPauseOrDispose { }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.staff_list_title)) },
                onSearchClick = onSearchClick
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddStaffClick,
                containerColor = SolennixTheme.colors.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.staff_list_cd_add_collaborator))
            }
        },
        contentWindowInsets = WindowInsets(0)
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = { viewModel.onSearchQueryChange(it) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    placeholder = { Text(stringResource(R.string.staff_list_search_placeholder)) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    shape = MaterialTheme.shapes.medium,
                    singleLine = true
                )

                Card(
                    onClick = onTeamsClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Group,
                            contentDescription = null,
                            tint = SolennixTheme.colors.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                stringResource(R.string.staff_team_list_title),
                                style = MaterialTheme.typography.titleSmall,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                stringResource(R.string.staff_list_teams_description),
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = null,
                            tint = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StaffSortOption.entries.forEach { option ->
                        FilterChip(
                            selected = uiState.sortOption == option,
                            onClick = { viewModel.onSortOptionChange(option) },
                            label = { Text(option.label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SolennixTheme.colors.primaryLight,
                                selectedLabelColor = SolennixTheme.colors.primary
                            )
                        )
                    }
                }

                if (uiState.isLoading && uiState.staff.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        repeat(4) {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                                shape = MaterialTheme.shapes.medium
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Skeleton avatar
                                    SkeletonLoading(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                    )
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        SkeletonLoading(
                                            modifier = Modifier
                                                .width(120.dp)
                                                .height(14.dp)
                                                .clip(RoundedCornerShape(4.dp))
                                        )
                                        SkeletonLoading(
                                            modifier = Modifier
                                                .width(80.dp)
                                                .height(10.dp)
                                                .clip(RoundedCornerShape(4.dp))
                                        )
                                        SkeletonLoading(
                                            modifier = Modifier
                                                .width(160.dp)
                                                .height(10.dp)
                                                .clip(RoundedCornerShape(4.dp))
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else if (uiState.staff.isEmpty()) {
                    Box(
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                stringResource(R.string.staff_list_empty_title),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                stringResource(R.string.staff_list_empty_description),
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                } else {
                    AdaptiveCardGrid(
                        gridContent = {
                            items(uiState.staff, key = { it.id }) { staff ->
                                Card(
                                    onClick = { onStaffClick(staff.id) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = SolennixTheme.colors.card
                                    ),
                                    shape = MaterialTheme.shapes.medium
                                ) {
                                    StaffListItem(
                                        staff = staff,
                                        onClick = { onStaffClick(staff.id) },
                                        onLongClick = {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            rowActionsStaff = staff
                                        }
                                    )
                                }
                            }
                        },
                        listContent = {
                            items(uiState.staff, key = { it.id }) { staff ->
                                StaffListItem(
                                    staff = staff,
                                    onClick = { onStaffClick(staff.id) },
                                    onLongClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        rowActionsStaff = staff
                                    }
                                )
                                HorizontalDivider(
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                    color = SolennixTheme.colors.divider.copy(alpha = 0.5f)
                                )
                            }
                        }
                    )
                }
            }
        }
    }

    rowActionsStaff?.let { staff ->
        StaffRowActionsBottomSheet(
            staff = staff,
            onEdit = {
                rowActionsStaff = null
                onStaffEdit(staff.id)
            },
            onCall = {
                rowActionsStaff = null
                try {
                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${staff.phone}"))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(context, "No se pudo realizar la llamada", Toast.LENGTH_SHORT).show()
                }
            },
            onEmail = {
                rowActionsStaff = null
                try {
                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${staff.email}"))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(context, "No se pudo enviar el correo", Toast.LENGTH_SHORT).show()
                }
            },
            onDelete = {
                rowActionsStaff = null
                deleteConfirmStaff = staff
            },
            onDismiss = { rowActionsStaff = null }
        )
    }

    deleteConfirmStaff?.let { staff ->
        AlertDialog(
            onDismissRequest = { deleteConfirmStaff = null },
            title = { Text(stringResource(R.string.staff_detail_delete_title)) },
            text = { Text(stringResource(R.string.staff_detail_delete_message)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteStaff(staff.id)
                    deleteConfirmStaff = null
                }) {
                    Text(stringResource(R.string.staff_delete), color = SolennixTheme.colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmStaff = null }) {
                    Text(stringResource(R.string.staff_cancel))
                }
            }
        )
    }

    viewModel.deleteErrorMessage?.let { errorMsg ->
        AlertDialog(
            onDismissRequest = { viewModel.clearDeleteError() },
            title = { Text(stringResource(R.string.staff_detail_delete_title)) },
            text = { Text(errorMsg) },
            confirmButton = {
                TextButton(onClick = { viewModel.clearDeleteError() }) {
                    Text(stringResource(R.string.staff_ok))
                }
            }
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun StaffListItem(
    staff: Staff,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(name = staff.name, photoUrl = null, size = 48.dp)
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = staff.name,
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )
            if (!staff.roleLabel.isNullOrBlank()) {
                Text(
                    text = staff.roleLabel!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.primary
                )
            }
            val subtitle = listOfNotNull(
                staff.phone?.takeIf { it.isNotBlank() },
                staff.email?.takeIf { it.isNotBlank() }
            ).joinToString(" · ")
            if (subtitle.isNotBlank()) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
    }
}
