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
import androidx.compose.ui.res.stringResource
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.UpgradeBanner
import com.creapolis.solennix.core.designsystem.component.UpgradeBannerStyle
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.feature.inventory.InventoryStrings
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryFormScreen(
    viewModel: InventoryFormViewModel,
    onSearchClick: () -> Unit = {},
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
            SolennixTopAppBar(
                title = { Text(InventoryStrings.formTitle) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
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
            AdaptiveCenteredContent(maxWidth = 800.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(scrollState)
                        .imePadding()
                ) {
                    // Plan limit banner (only shown when creating a new item)
                    val limitResult = viewModel.limitCheckResult
                    if (limitResult is LimitCheckResult.LimitReached) {
                        UpgradeBanner(
                            message = limitResult.message,
                            style = UpgradeBannerStyle.LIMIT,
                            onUpgradeClick = { /* Handled via Settings > Suscripción */ },
                            visible = true
                        )
                    } else if (limitResult is LimitCheckResult.NearLimit) {
                        UpgradeBanner(
                            message = InventoryStrings.nearLimitMessage(limitResult.remaining),
                            style = UpgradeBannerStyle.WARNING,
                            onUpgradeClick = { /* Handled via Settings > Suscripción */ },
                            visible = true
                        )
                    }

                    Column(modifier = Modifier.padding(16.dp)) {
                        // Form fields — side-by-side on tablet via AdaptiveFormRow
                        val commonUnits = InventoryStrings.commonUnits()
                        var unitExpanded by remember { mutableStateOf(false) }

                        // Row 1: Name + Type selector
                        AdaptiveFormRow(
                            left = {
                                SolennixTextField(
                                    value = viewModel.ingredientName,
                                    onValueChange = { viewModel.ingredientName = it },
                                    label = InventoryStrings.itemNameRequired,
                                    leadingIcon = Icons.Default.Archive
                                )
                            },
                            right = {
                                Column {
                                    Text(
                                        text = InventoryStrings.typeRequired,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                                        val types = listOf(
                                            InventoryType.INGREDIENT to InventoryStrings.ingredientType,
                                            InventoryType.EQUIPMENT to InventoryStrings.equipmentType,
                                            InventoryType.SUPPLY to InventoryStrings.supplyType
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
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        // Row 2: Current stock + Minimum stock
                        AdaptiveFormRow(
                            left = {
                                SolennixTextField(
                                    value = viewModel.currentStock,
                                    onValueChange = { viewModel.currentStock = it },
                                    label = InventoryStrings.stockCurrentRequired,
                                    keyboardType = KeyboardType.Decimal
                                )
                            },
                            right = {
                                SolennixTextField(
                                    value = viewModel.minimumStock,
                                    onValueChange = { viewModel.minimumStock = it },
                                    label = InventoryStrings.stockMinimumRequired,
                                    keyboardType = KeyboardType.Decimal
                                )
                            }
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        // Row 3: Unit + Cost
                        AdaptiveFormRow(
                            left = {
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
                                        label = { Text(InventoryStrings.unitRequired) },
                                        leadingIcon = {
                                            Icon(
                                                imageVector = Icons.Default.Scale,
                                                contentDescription = stringResource(DesignSystemR.string.cd_scale)
                                            )
                                        },
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
                            },
                            right = {
                                SolennixTextField(
                                    value = viewModel.unitCost,
                                    onValueChange = { viewModel.unitCost = it },
                                    label = InventoryStrings.unitCostOptional,
                                    leadingIcon = Icons.Default.AttachMoney,
                                    keyboardType = KeyboardType.Decimal
                                )
                            }
                        )
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
                            text = InventoryStrings.save,
                            onClick = { viewModel.saveItem() },
                            isLoading = viewModel.isSaving,
                            enabled = viewModel.isFormValid && !viewModel.isLimitReached
                        )
                        Spacer(modifier = Modifier.height(32.dp))
                    }
                }
            }
        }
    }
}
