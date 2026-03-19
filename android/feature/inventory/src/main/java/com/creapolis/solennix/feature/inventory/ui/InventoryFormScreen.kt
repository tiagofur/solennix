package com.creapolis.solennix.feature.inventory.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Scale
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryFormScreen(
    viewModel: InventoryFormViewModel,
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Item de Inventario") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
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
                    value = viewModel.ingredientName,
                    onValueChange = { viewModel.ingredientName = it },
                    label = "Nombre del Item *",
                    leadingIcon = Icons.Default.Archive
                )
                Spacer(modifier = Modifier.height(16.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    SolennixTextField(
                        value = viewModel.currentStock,
                        onValueChange = { viewModel.currentStock = it },
                        label = "Stock Actual *",
                        keyboardType = KeyboardType.Decimal,
                        modifier = Modifier.weight(1f)
                    )
                    SolennixTextField(
                        value = viewModel.minimumStock,
                        onValueChange = { viewModel.minimumStock = it },
                        label = "Stock Mínimo *",
                        keyboardType = KeyboardType.Decimal,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    SolennixTextField(
                        value = viewModel.unit,
                        onValueChange = { viewModel.unit = it },
                        label = "Unidad (ej. kg) *",
                        leadingIcon = Icons.Default.Scale,
                        modifier = Modifier.weight(1f)
                    )
                    SolennixTextField(
                        value = viewModel.unitCost,
                        onValueChange = { viewModel.unitCost = it },
                        label = "Costo Unitario",
                        leadingIcon = Icons.Default.AttachMoney,
                        keyboardType = KeyboardType.Decimal,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(32.dp))

                if (viewModel.errorMessage != null) {
                    Text(
                        text = viewModel.errorMessage.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                PremiumButton(
                    text = "Guardar",
                    onClick = { viewModel.saveItem() },
                    isLoading = viewModel.isSaving,
                    enabled = viewModel.isFormValid
                )
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
