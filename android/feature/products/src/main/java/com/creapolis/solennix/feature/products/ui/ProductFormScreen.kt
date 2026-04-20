package com.creapolis.solennix.feature.products.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.products.viewmodel.ProductFormViewModel
import com.creapolis.solennix.feature.products.viewmodel.RecipeItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFormScreen(
    viewModel: ProductFormViewModel,
    onSearchClick: () -> Unit = {},
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    val context = LocalContext.current

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            onNavigateBack()
        }
    }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.uploadImage(context, it) }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Producto") },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            AdaptiveCenteredContent(maxWidth = 800.dp) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Image section
                Text(
                    text = "Imagen del Producto",
                    style = MaterialTheme.typography.labelLarge,
                    color = SolennixTheme.colors.primary,
                    modifier = Modifier.padding(bottom = 0.dp)
                )

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    color = SolennixTheme.colors.card,
                    tonalElevation = 1.dp
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(180.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(SolennixTheme.colors.surfaceGrouped)
                                .clickable(enabled = !viewModel.isUploadingImage) {
                                    imagePickerLauncher.launch("image/*")
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            if (viewModel.imageUrl.isNotBlank()) {
                                AsyncImage(
                                    model = ImageRequest.Builder(context)
                                        .data(UrlResolver.resolve(viewModel.imageUrl))
                                        .crossfade(true)
                                        .build(),
                                    contentDescription = stringResource(DesignSystemR.string.cd_visibility),
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.Image,
                                        contentDescription = stringResource(DesignSystemR.string.cd_visibility),
                                        modifier = Modifier.size(48.dp),
                                        tint = SolennixTheme.colors.secondaryText
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Toca para seleccionar imagen",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }
                            }

                            if (viewModel.isUploadingImage) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            SolennixTheme.colors.surfaceGrouped.copy(alpha = 0.7f)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = SolennixTheme.colors.primary)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedButton(
                            onClick = { imagePickerLauncher.launch("image/*") },
                            enabled = !viewModel.isUploadingImage
                        ) {
                            if (viewModel.isUploadingImage) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp,
                                    color = SolennixTheme.colors.primary
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Subiendo...")
                            } else {
                                Icon(
                                    Icons.Default.PhotoCamera,
                                    contentDescription = stringResource(DesignSystemR.string.cd_edit),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    if (viewModel.imageUrl.isNotBlank()) "Cambiar Imagen"
                                    else "Seleccionar Imagen"
                                )
                            }
                        }
                    }
                }

                // Basic info fields
                var categoryExpanded by remember { mutableStateOf(false) }
                AdaptiveFormRow(
                    left = {
                        SolennixTextField(
                            value = viewModel.name,
                            onValueChange = { viewModel.name = it },
                            label = "Nombre *",
                            leadingIcon = Icons.Default.ShoppingCart
                        )
                    },
                    right = {
                        val filteredCategories = viewModel.existingCategories.filter {
                            it.contains(viewModel.category, ignoreCase = true) && it != viewModel.category
                        }
                        ExposedDropdownMenuBox(
                            expanded = categoryExpanded && filteredCategories.isNotEmpty(),
                            onExpandedChange = { categoryExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = viewModel.category,
                                onValueChange = {
                                    viewModel.category = it
                                    categoryExpanded = true
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(MenuAnchorType.PrimaryEditable),
                                label = { Text("Categoría *") },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Category,
                                        contentDescription = stringResource(DesignSystemR.string.cd_category)
                                    )
                                },
                                shape = MaterialTheme.shapes.small,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = SolennixTheme.colors.primary,
                                    focusedLabelColor = SolennixTheme.colors.primary,
                                    cursorColor = SolennixTheme.colors.primary
                                ),
                                singleLine = true
                            )
                            ExposedDropdownMenu(
                                expanded = categoryExpanded && filteredCategories.isNotEmpty(),
                                onDismissRequest = { categoryExpanded = false }
                            ) {
                                filteredCategories.forEach { cat ->
                                    DropdownMenuItem(
                                        text = { Text(cat) },
                                        onClick = {
                                            viewModel.category = cat
                                            categoryExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                )

                AdaptiveFormRow(
                    left = {
                        SolennixTextField(
                            value = viewModel.basePrice,
                            onValueChange = { viewModel.basePrice = it },
                            label = "Precio Base *",
                            leadingIcon = Icons.Default.AttachMoney,
                            keyboardType = KeyboardType.Decimal
                        )
                    },
                    right = {
                        // Active toggle
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Producto activo",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Text(
                                    text = "Visible en cotizaciones",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                            Switch(
                                checked = viewModel.isActive,
                                onCheckedChange = { viewModel.isActive = it },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = SolennixTheme.colors.primary,
                                    checkedTrackColor = SolennixTheme.colors.primaryLight
                                )
                            )
                        }
                    }
                )

                // Recipe sections
                RecipeSectionCard(
                    title = "Composición / Insumos",
                    description = "Solo insumos generan costo al producto.",
                    items = viewModel.ingredients,
                    inventoryItems = viewModel.ingredientInventoryItems,
                    onAdd = { viewModel.addIngredient() },
                    onRemove = { viewModel.removeIngredient(it) },
                    onSelectInventory = { index, invId ->
                        viewModel.updateRecipeInventory(viewModel.ingredients, index, invId)
                    },
                    onUpdateQuantity = { index, qty ->
                        viewModel.updateRecipeQuantity(viewModel.ingredients, index, qty)
                    },
                    showCost = true
                )

                RecipeSectionCard(
                    title = "Equipo Necesario",
                    description = "Activos reutilizables. No se incluyen en el costo.",
                    items = viewModel.equipment,
                    inventoryItems = viewModel.equipmentInventoryItems,
                    onAdd = { viewModel.addEquipment() },
                    onRemove = { viewModel.removeEquipment(it) },
                    onSelectInventory = { index, invId ->
                        viewModel.updateRecipeInventory(viewModel.equipment, index, invId)
                    },
                    onUpdateQuantity = { index, qty ->
                        viewModel.updateRecipeQuantity(viewModel.equipment, index, qty)
                    },
                    showCost = false
                )

                RecipeSectionCard(
                    title = "Insumos por Evento",
                    description = "Costo fijo por evento (ej. aceite, gas).",
                    items = viewModel.supplies,
                    inventoryItems = viewModel.supplyInventoryItems,
                    onAdd = { viewModel.addSupply() },
                    onRemove = { viewModel.removeSupply(it) },
                    onSelectInventory = { index, invId ->
                        viewModel.updateRecipeInventory(viewModel.supplies, index, invId)
                    },
                    onUpdateQuantity = { index, qty ->
                        viewModel.updateRecipeQuantity(viewModel.supplies, index, qty)
                    },
                    showCost = true
                )

                StaffTeamSection(viewModel = viewModel)

                if (viewModel.errorMessage != null) {
                    Text(
                        text = viewModel.errorMessage.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                PremiumButton(
                    text = "Guardar",
                    onClick = { viewModel.saveProduct() },
                    isLoading = viewModel.isSaving,
                    enabled = viewModel.isFormValid
                )
                Spacer(modifier = Modifier.height(32.dp))
            }
            }
        }
    }
}

@Composable
private fun RecipeSectionCard(
    title: String,
    description: String,
    items: List<RecipeItem>,
    inventoryItems: List<InventoryItem>,
    onAdd: () -> Unit,
    onRemove: (Int) -> Unit,
    onSelectInventory: (Int, String) -> Unit,
    onUpdateQuantity: (Int, Double) -> Unit,
    showCost: Boolean
) {
    val colors = SolennixTheme.colors

    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.primaryText
                    )
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.tertiaryText
                    )
                }
                TextButton(onClick = onAdd) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = stringResource(DesignSystemR.string.cd_add),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Agregar")
                }
            }

            if (items.isEmpty()) {
                Text(
                    text = "No hay elementos agregados",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.tertiaryText,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp)
                )
            } else {
                items.forEachIndexed { index, item ->
                    if (index > 0) HorizontalDivider(color = colors.divider.copy(alpha = 0.5f))
                    RecipeItemRow(
                        item = item,
                        inventoryItems = inventoryItems,
                        onSelectInventory = { invId -> onSelectInventory(index, invId) },
                        onUpdateQuantity = { qty -> onUpdateQuantity(index, qty) },
                        onRemove = { onRemove(index) },
                        showCost = showCost
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecipeItemRow(
    item: RecipeItem,
    inventoryItems: List<InventoryItem>,
    onSelectInventory: (String) -> Unit,
    onUpdateQuantity: (Double) -> Unit,
    onRemove: () -> Unit,
    showCost: Boolean
) {
    val colors = SolennixTheme.colors
    var showPicker by remember { mutableStateOf(false) }
    var quantityText by remember(item.quantityRequired) {
        mutableStateOf(
            if (item.quantityRequired == item.quantityRequired.toLong().toDouble())
                item.quantityRequired.toLong().toString()
            else "%.1f".format(item.quantityRequired)
        )
    }

    if (showPicker) {
        InventoryPickerBottomSheet(
            inventoryItems = inventoryItems,
            selectedId = item.inventoryId,
            onSelect = { id ->
                onSelectInventory(id)
                showPicker = false
            },
            onDismiss = { showPicker = false }
        )
    }

    Column(
        modifier = Modifier.padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Inventory selector
        Surface(
            onClick = { showPicker = true },
            shape = MaterialTheme.shapes.medium,
            color = colors.surfaceGrouped,
            border = androidx.compose.foundation.BorderStroke(1.dp, colors.divider),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Inventory2,
                    contentDescription = stringResource(DesignSystemR.string.cd_category),
                    tint = if (item.inventoryId.isNotBlank()) colors.primary else colors.tertiaryText,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.inventoryName ?: "Seleccionar item...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (item.inventoryId.isNotBlank()) colors.primaryText else colors.tertiaryText
                    )
                    if (item.unitCost != null && item.unitCost!! > 0 && showCost) {
                        Text(
                            text = "Costo: ${item.unitCost!!.asMXN()} / ${item.unit ?: "und"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.secondaryText
                        )
                    }
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = stringResource(DesignSystemR.string.cd_visibility),
                    tint = colors.tertiaryText,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        // Quantity + cost + remove
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Cantidad",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.tertiaryText
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = quantityText,
                        onValueChange = { newValue ->
                            quantityText = newValue
                            newValue.toDoubleOrNull()?.let { onUpdateQuantity(it) }
                        },
                        modifier = Modifier.width(80.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        textStyle = MaterialTheme.typography.bodyMedium,
                        shape = RoundedCornerShape(8.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.primary,
                            cursorColor = colors.primary
                        )
                    )
                    if (item.unit != null) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = item.unit!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.tertiaryText
                        )
                    }
                }
            }

            if (showCost && item.unitCost != null && item.unitCost!! > 0) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Costo est.",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.tertiaryText
                    )
                    Text(
                        text = (item.quantityRequired * item.unitCost!!).asMXN(),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = colors.primaryText
                    )
                }
            }

            IconButton(onClick = onRemove) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = stringResource(DesignSystemR.string.cd_delete),
                    tint = colors.error,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StaffTeamSection(viewModel: ProductFormViewModel) {
    val colors = SolennixTheme.colors
    var expanded by remember { mutableStateOf(false) }
    val teams = viewModel.availableTeams
    val selected = teams.find { it.id == viewModel.staffTeamId }
    val selectedText = selected?.name ?: "Sin equipo"

    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Equipo asociado",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = colors.primaryText
            )
            Text(
                text = "Agregá un equipo para vender el servicio de meseros con este producto.",
                style = MaterialTheme.typography.bodySmall,
                color = colors.tertiaryText
            )

            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it }
            ) {
                OutlinedTextField(
                    value = selectedText,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Equipo") },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Groups,
                            contentDescription = null
                        )
                    },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    shape = MaterialTheme.shapes.small,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        focusedLabelColor = colors.primary,
                        cursorColor = colors.primary
                    ),
                    singleLine = true
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Sin equipo") },
                        onClick = {
                            viewModel.staffTeamId = null
                            expanded = false
                        }
                    )
                    teams.forEach { team ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(team.name)
                                    val count = team.memberCount ?: team.members?.size
                                    if (count != null) {
                                        Text(
                                            text = "$count integrantes",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.secondaryText
                                        )
                                    }
                                }
                            },
                            onClick = {
                                viewModel.staffTeamId = team.id
                                expanded = false
                            }
                        )
                    }
                }
            }

            if (viewModel.staffTeamId != null) {
                Text(
                    text = "Cuando agregues este producto a un evento, se asignan automáticamente los miembros del equipo como personal.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.secondaryText
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InventoryPickerBottomSheet(
    inventoryItems: List<InventoryItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val colors = SolennixTheme.colors
    var searchQuery by remember { mutableStateOf("") }

    val filtered = if (searchQuery.isBlank()) inventoryItems
    else inventoryItems.filter {
        it.ingredientName.contains(searchQuery, ignoreCase = true)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            Text(
                text = "Seleccionar Item",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = colors.primaryText,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar item...") },
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = stringResource(DesignSystemR.string.cd_search)
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    cursorColor = colors.primary
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                modifier = Modifier.heightIn(max = 400.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                itemsIndexed(filtered) { _, item ->
                    Surface(
                        onClick = { onSelect(item.id) },
                        shape = MaterialTheme.shapes.medium,
                        color = if (item.id == selectedId) colors.primary.copy(alpha = 0.08f)
                        else colors.card
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.ingredientName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.primaryText
                                )
                                Text(
                                    text = "Stock: ${item.currentStock.toInt()} ${item.unit}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.secondaryText
                                )
                            }
                            if (item.unitCost != null && item.unitCost!! > 0) {
                                Text(
                                    text = item.unitCost!!.asMXN(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.secondaryText
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                            if (item.id == selectedId) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = stringResource(DesignSystemR.string.cd_check),
                                    tint = colors.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
