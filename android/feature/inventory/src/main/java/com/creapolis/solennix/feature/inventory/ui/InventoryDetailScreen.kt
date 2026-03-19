package com.creapolis.solennix.feature.inventory.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryDetailScreen(
    viewModel: InventoryDetailViewModel,
    onNavigateBack: () -> Unit,
    onEditClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showDeleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) {
            onNavigateBack()
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Eliminar Item") },
            text = { Text("¿Estás seguro de que deseas eliminar este item del inventario? Esta acción no se puede deshacer.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deleteItem()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle de Inventario") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    uiState.item?.let { item ->
                        IconButton(onClick = { onEditClick(item.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit")
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.errorMessage != null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(uiState.errorMessage.orEmpty(), color = SolennixTheme.colors.error)
            }
        } else if (uiState.item != null) {
            val item = uiState.item ?: return@Scaffold
            val scrollState = rememberScrollState()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(24.dp)
            ) {
                Text(
                    text = item.ingredientName,
                    style = MaterialTheme.typography.headlineMedium,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                Surface(
                    color = SolennixTheme.colors.surfaceAlt,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = item.type.name.uppercase(),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Text("Stock Actual", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
                        val isLow = item.currentStock <= item.minimumStock
                        Text(
                            text = "${item.currentStock} ${item.unit}",
                            style = MaterialTheme.typography.titleLarge,
                            color = if (isLow) SolennixTheme.colors.error else SolennixTheme.colors.success,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Text("Stock Mínimo", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
                        Text(
                            text = "${item.minimumStock} ${item.unit}",
                            style = MaterialTheme.typography.titleLarge,
                            color = SolennixTheme.colors.primaryText,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                        )
                    }
                }
                
                if (item.unitCost != null) {
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("Costo Unitario", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
                    Text("$${item.unitCost}", style = MaterialTheme.typography.bodyLarge, color = SolennixTheme.colors.primaryText)
                }

                Spacer(modifier = Modifier.height(24.dp))
                Text("Última actualización: ${item.lastUpdated}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.tertiaryText)
            }
        }
    }
}
