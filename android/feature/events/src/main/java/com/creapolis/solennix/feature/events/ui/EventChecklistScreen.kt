package com.creapolis.solennix.feature.events.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.viewmodel.ChecklistItem
import com.creapolis.solennix.feature.events.viewmodel.ChecklistSection
import com.creapolis.solennix.feature.events.viewmodel.EventChecklistUiState
import com.creapolis.solennix.feature.events.viewmodel.EventChecklistViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventChecklistScreen(
    viewModel: EventChecklistViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showResetDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Checklist") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { showResetDialog = true }) {
                        Icon(Icons.Default.RestartAlt, contentDescription = "Reiniciar")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            if (uiState.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (uiState.error != null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(uiState.error.orEmpty(), color = SolennixTheme.colors.error)
                }
            } else if (uiState.items.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.Checklist,
                    title = "Sin elementos",
                    message = "No hay elementos en el checklist para este evento."
                )
            } else {
                // Progress header
                ChecklistProgressHeader(uiState = uiState)

                // Checklist content
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Equipment section
                    if (uiState.equipmentItems.isNotEmpty()) {
                        item {
                            ChecklistSectionHeader(
                                title = "Equipamiento",
                                icon = Icons.Default.Construction,
                                color = SolennixTheme.colors.primary,
                                itemCount = uiState.equipmentItems.size,
                                checkedCount = uiState.equipmentItems.count { uiState.checkedIds.contains(it.id) },
                                onCheckAll = { viewModel.checkAllInSection(ChecklistSection.EQUIPMENT) },
                                onUncheckAll = { viewModel.uncheckAllInSection(ChecklistSection.EQUIPMENT) }
                            )
                        }
                        items(uiState.equipmentItems, key = { it.id }) { item ->
                            ChecklistItemCard(
                                item = item,
                                isChecked = uiState.checkedIds.contains(item.id),
                                onToggle = { viewModel.toggleItem(item.id) }
                            )
                        }
                    }

                    // Stock section
                    if (uiState.stockItems.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            ChecklistSectionHeader(
                                title = "De Inventario",
                                icon = Icons.Default.Inventory,
                                color = SolennixTheme.colors.success,
                                itemCount = uiState.stockItems.size,
                                checkedCount = uiState.stockItems.count { uiState.checkedIds.contains(it.id) },
                                onCheckAll = { viewModel.checkAllInSection(ChecklistSection.STOCK) },
                                onUncheckAll = { viewModel.uncheckAllInSection(ChecklistSection.STOCK) }
                            )
                        }
                        items(uiState.stockItems, key = { it.id }) { item ->
                            ChecklistItemCard(
                                item = item,
                                isChecked = uiState.checkedIds.contains(item.id),
                                onToggle = { viewModel.toggleItem(item.id) }
                            )
                        }
                    }

                    // Purchase section
                    if (uiState.purchaseItems.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            ChecklistSectionHeader(
                                title = "Por Comprar",
                                icon = Icons.Default.ShoppingCart,
                                color = SolennixTheme.colors.warning,
                                itemCount = uiState.purchaseItems.size,
                                checkedCount = uiState.purchaseItems.count { uiState.checkedIds.contains(it.id) },
                                onCheckAll = { viewModel.checkAllInSection(ChecklistSection.PURCHASE) },
                                onUncheckAll = { viewModel.uncheckAllInSection(ChecklistSection.PURCHASE) }
                            )
                        }
                        items(uiState.purchaseItems, key = { it.id }) { item ->
                            ChecklistItemCard(
                                item = item,
                                isChecked = uiState.checkedIds.contains(item.id),
                                onToggle = { viewModel.toggleItem(item.id) },
                                showCost = true
                            )
                        }

                        // Total cost for purchases
                        item {
                            val totalCost = uiState.purchaseItems.sumOf { it.quantity * it.unitCost }
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.warning.copy(alpha = 0.1f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Total Estimado de Compras", style = MaterialTheme.typography.titleSmall)
                                    Text(totalCost.asMXN(), style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.warning)
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(32.dp)) }
                }
            }
        }
    }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("Reiniciar Checklist") },
            text = { Text("¿Estás seguro de que quieres desmarcar todos los elementos?") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.resetChecklist()
                    showResetDialog = false
                }) {
                    Text("Reiniciar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun ChecklistProgressHeader(uiState: EventChecklistUiState) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SolennixTheme.colors.surfaceAlt)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(uiState.eventName, style = MaterialTheme.typography.titleMedium)
                Text(uiState.eventDate, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
            }
            Text(
                "${(uiState.progress * 100).toInt()}%",
                style = MaterialTheme.typography.headlineSmall,
                color = SolennixTheme.colors.primary
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        LinearProgressIndicator(
            progress = { uiState.progress },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = SolennixTheme.colors.primary,
            trackColor = SolennixTheme.colors.border
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "${uiState.checkedIds.size} de ${uiState.items.size} completados",
            style = MaterialTheme.typography.bodySmall,
            color = SolennixTheme.colors.secondaryText
        )
    }
}

@Composable
fun ChecklistSectionHeader(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: androidx.compose.ui.graphics.Color,
    itemCount: Int,
    checkedCount: Int,
    onCheckAll: () -> Unit,
    onUncheckAll: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(title, style = MaterialTheme.typography.titleMedium, color = color)
            Spacer(modifier = Modifier.width(8.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = color.copy(alpha = 0.1f)
            ) {
                Text(
                    "$checkedCount/$itemCount",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = color
                )
            }
        }
        Row {
            IconButton(onClick = onCheckAll, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.CheckBox, null, tint = SolennixTheme.colors.success, modifier = Modifier.size(20.dp))
            }
            IconButton(onClick = onUncheckAll, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.CheckBoxOutlineBlank, null, tint = SolennixTheme.colors.secondaryText, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
fun ChecklistItemCard(
    item: ChecklistItem,
    isChecked: Boolean,
    onToggle: () -> Unit,
    showCost: Boolean = false
) {
    val backgroundColor by animateColorAsState(
        targetValue = if (isChecked) SolennixTheme.colors.success.copy(alpha = 0.1f) else SolennixTheme.colors.card,
        label = "bgColor"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggle() },
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = isChecked,
                onCheckedChange = { onToggle() },
                colors = CheckboxDefaults.colors(
                    checkedColor = SolennixTheme.colors.success,
                    uncheckedColor = SolennixTheme.colors.secondaryText
                )
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    item.name,
                    style = MaterialTheme.typography.bodyLarge,
                    textDecoration = if (isChecked) TextDecoration.LineThrough else TextDecoration.None,
                    color = if (isChecked) SolennixTheme.colors.secondaryText else SolennixTheme.colors.primaryText
                )
                Text(
                    "${item.quantity} ${item.unit}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            if (showCost && item.unitCost > 0) {
                Text(
                    (item.quantity * item.unitCost).asMXN(),
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.warning
                )
            }
            if (isChecked) {
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    Icons.Default.CheckCircle,
                    null,
                    tint = SolennixTheme.colors.success,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
