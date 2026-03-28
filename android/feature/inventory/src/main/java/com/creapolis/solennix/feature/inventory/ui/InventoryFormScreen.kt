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
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.InventoryType
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
                // Form fields — 2-column on tablet, single column on phone
                val isWide = LocalIsWideScreen.current
                val commonUnits = listOf("pieza", "kg", "g", "l", "ml", "caja", "paquete")
                var unitExpanded by remember { mutableStateOf(false) }

                if (isWide) {
                    // Row 1: Name + Type selector
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Box(modifier = Modifier.weight(1f)) {
                            SolennixTextField(
                                value = viewModel.ingredientName,
                                onValueChange = { viewModel.ingredientName = it },
                                label = "Nombre del Item *",
                                leadingIcon = Icons.Default.Archive
                            )
                        }
                        Box(modifier = Modifier.weight(1f)) {
                            Column {
                                Text(
                                    text = "Tipo *",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = SolennixTheme.colors.secondaryText
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                                    val types = listOf(
                                        InventoryType.INGREDIENT to "Ingrediente",
                                        InventoryType.EQUIPMENT to "Equipo",
                                        InventoryType.SUPPLY to "Insumo"
                                    )
                                    types.forEachIndexed { index, (type, label) ->
                                        SegmentedButton(
                                            shape = SegmentedButtonDefaults.itemShape(index = index, count = types.size),
                                            onClick = { viewModel.type = type },
                                            selected = viewModel.type == type
                                        ) {
                                            Text(label)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    // Row 2: Current stock + Minimum stock
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Box(modifier = Modifier.weight(1f)) {
                            SolennixTextField(
                                value = viewModel.currentStock,
                                onValueChange = { viewModel.currentStock = it },
                                label = "Stock Actual *",
                                keyboardType = KeyboardType.Decimal
                            )
                        }
                        Box(modifier = Modifier.weight(1f)) {
                            SolennixTextField(
                                value = viewModel.minimumStock,
                                onValueChange = { viewModel.minimumStock = it },
                                label = "Stock Mínimo *",
                                keyboardType = KeyboardType.Decimal
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    // Row 3: Unit + Cost
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Box(modifier = Modifier.weight(1f)) {
                            ExposedDropdownMenuBox(
                                expanded = unitExpanded,
                                onExpandedChange = { unitExpanded = it }
                            ) {
                                OutlinedTextField(
                                    value = viewModel.unit,
                                    onValueChange = { viewModel.unit = it },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .menuAnchor(MenuAnchorType.PrimaryEditable),
                                    label = { Text("Unidad *") },
                                    leadingIcon = { Icon(Icons.Default.Scale, contentDescription = null) },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = unitExpanded) },
                                    shape = MaterialTheme.shapes.small,
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = SolennixTheme.colors.primary,
                                        focusedLabelColor = SolennixTheme.colors.primary,
                                        cursorColor = SolennixTheme.colors.primary
                                    ),
                                    singleLine = true
                                )
                                val filteredUnits = commonUnits.filter {
                                    it.contains(viewModel.unit, ignoreCase = true)
                                }
                                if (filteredUnits.isNotEmpty()) {
                                    ExposedDropdownMenu(
                                        expanded = unitExpanded,
                                        onDismissRequest = { unitExpanded = false }
                                    ) {
                                        filteredUnits.forEach { unitOption ->
                                            DropdownMenuItem(
                                                text = { Text(unitOption) },
                                                onClick = {
                                                    viewModel.unit = unitOption
                                                    unitExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        Box(modifier = Modifier.weight(1f)) {
                            SolennixTextField(
                                value = viewModel.unitCost,
                                onValueChange = { viewModel.unitCost = it },
                                label = "Costo Unitario",
                                leadingIcon = Icons.Default.AttachMoney,
                                keyboardType = KeyboardType.Decimal
                            )
                        }
                    }
                } else {
                    // Phone: single-column layout
                    SolennixTextField(
                        value = viewModel.ingredientName,
                        onValueChange = { viewModel.ingredientName = it },
                        label = "Nombre del Item *",
                        leadingIcon = Icons.Default.Archive
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    // Type selector
                    Text(
                        text = "Tipo *",
                        style = MaterialTheme.typography.labelMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                        val types = listOf(
                            InventoryType.INGREDIENT to "Ingrediente",
                            InventoryType.EQUIPMENT to "Equipo",
                            InventoryType.SUPPLY to "Insumo"
                        )
                        types.forEachIndexed { index, (type, label) ->
                            SegmentedButton(
                                shape = SegmentedButtonDefaults.itemShape(index = index, count = types.size),
                                onClick = { viewModel.type = type },
                                selected = viewModel.type == type
                            ) {
                                Text(label)
                            }
                        }
                    }
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
                        ExposedDropdownMenuBox(
                            expanded = unitExpanded,
                            onExpandedChange = { unitExpanded = it },
                            modifier = Modifier.weight(1f)
                        ) {
                            OutlinedTextField(
                                value = viewModel.unit,
                                onValueChange = { viewModel.unit = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(MenuAnchorType.PrimaryEditable),
                                label = { Text("Unidad *") },
                                leadingIcon = { Icon(Icons.Default.Scale, contentDescription = null) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = unitExpanded) },
                                shape = MaterialTheme.shapes.small,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = SolennixTheme.colors.primary,
                                    focusedLabelColor = SolennixTheme.colors.primary,
                                    cursorColor = SolennixTheme.colors.primary
                                ),
                                singleLine = true
                            )
                            val filteredUnits = commonUnits.filter {
                                it.contains(viewModel.unit, ignoreCase = true)
                            }
                            if (filteredUnits.isNotEmpty()) {
                                ExposedDropdownMenu(
                                    expanded = unitExpanded,
                                    onDismissRequest = { unitExpanded = false }
                                ) {
                                    filteredUnits.forEach { unitOption ->
                                        DropdownMenuItem(
                                            text = { Text(unitOption) },
                                            onClick = {
                                                viewModel.unit = unitOption
                                                unitExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                        SolennixTextField(
                            value = viewModel.unitCost,
                            onValueChange = { viewModel.unitCost = it },
                            label = "Costo Unitario",
                            leadingIcon = Icons.Default.AttachMoney,
                            keyboardType = KeyboardType.Decimal,
                            modifier = Modifier.weight(1f)
                        )
                    }
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
