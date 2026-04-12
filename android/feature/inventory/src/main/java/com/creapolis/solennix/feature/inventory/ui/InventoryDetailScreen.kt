package com.creapolis.solennix.feature.inventory.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveDetailLayout
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryDetailViewModel
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryDemandEntry
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryDetailScreen(
    viewModel: InventoryDetailViewModel,
    onNavigateBack: () -> Unit,
    onSearchClick: () -> Unit = {},
    onEditClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showAdjustSheet by remember { mutableStateOf(false) }
    var adjustmentValue by remember { mutableStateOf("") }

    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) onNavigateBack()
    }

    LaunchedEffect(viewModel.adjustmentSuccess) {
        if (viewModel.adjustmentSuccess) showAdjustSheet = false
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Eliminar Item") },
            text = { Text("¿Estás seguro de que deseas eliminar este item del inventario? Esta acción no se puede deshacer.") },
            confirmButton = {
                TextButton(
                    onClick = { showDeleteDialog = false; viewModel.deleteItem() },
                    colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                ) { Text("Eliminar") }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancelar") }
            }
        )
    }

    if (showAdjustSheet) {
        StockAdjustmentSheet(
            itemName = uiState.item?.ingredientName ?: "",
            currentStock = uiState.item?.currentStock ?: 0.0,
            unit = uiState.item?.unit ?: "",
            adjustmentValue = adjustmentValue,
            onValueChange = { adjustmentValue = it },
            onQuickAdjust = { delta ->
                val current = adjustmentValue.toDoubleOrNull() ?: (uiState.item?.currentStock ?: 0.0)
                adjustmentValue = (current + delta).coerceAtLeast(0.0).let {
                    if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it)
                }
            },
            onSave = {
                adjustmentValue.toDoubleOrNull()?.let { viewModel.adjustStock(it) }
            },
            onDismiss = { showAdjustSheet = false }
        )
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Detalle de Inventario") },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                },
                actions = {
                    uiState.item?.let { item ->
                        IconButton(onClick = {
                            adjustmentValue = item.currentStock.let {
                                if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it)
                            }
                            showAdjustSheet = true
                        }) {
                            Icon(
                                imageVector = Icons.Default.Tune,
                                contentDescription = stringResource(DesignSystemR.string.cd_tune)
                            )
                        }
                        IconButton(onClick = { onEditClick(item.id) }) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = stringResource(DesignSystemR.string.cd_edit)
                            )
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = stringResource(DesignSystemR.string.cd_delete),
                                tint = SolennixTheme.colors.error
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        val colors = SolennixTheme.colors

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.errorMessage != null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(uiState.errorMessage.orEmpty(), color = colors.error)
            }
        } else if (uiState.item != null) {
            val item = uiState.item ?: return@Scaffold

            val typeBadgeColor = when (item.type.name) {
                "EQUIPMENT" -> Color(0xFF9C27B0)
                "SUPPLY" -> Color(0xFFFF9800)
                else -> colors.primary
            }
            val typeLabel = when (item.type.name) {
                "EQUIPMENT" -> "Activo / Equipo"
                "SUPPLY" -> "Insumo por Evento"
                else -> "Insumo Consumible"
            }
            val isCritical = uiState.demand7Days > 0 && uiState.stockAfter7Days < 0
            val stockColor = when {
                isCritical -> colors.error
                uiState.isLowStock -> colors.warning
                else -> Color(0xFF4CAF50)
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                Text(item.ingredientName, style = MaterialTheme.typography.headlineMedium, color = colors.primaryText)
                Surface(shape = RoundedCornerShape(16.dp), color = typeBadgeColor.copy(alpha = 0.1f)) {
                    Text(
                        typeLabel,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = typeBadgeColor,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }

                AdaptiveDetailLayout(
                    left = {
                        // KPI cards
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            InventoryKpiCard(
                                icon = Icons.Default.Inventory2,
                                iconColor = stockColor,
                                label = "Stock Actual",
                                value = "${item.currentStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }}",
                                subtitle = item.unit,
                                valueColor = stockColor,
                                extraLabel = if (uiState.isLowStock) "Bajo mínimo" else null,
                                extraColor = if (isCritical) colors.error else colors.warning,
                                iconContentDescription = stringResource(DesignSystemR.string.cd_scale),
                                modifier = Modifier.weight(1f)
                            )
                            InventoryKpiCard(
                                icon = Icons.Default.TrendingDown,
                                iconColor = colors.secondaryText,
                                label = "Stock Mínimo",
                                value = "${item.minimumStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }}",
                                subtitle = item.unit,
                                iconContentDescription = stringResource(DesignSystemR.string.cd_warning),
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            InventoryKpiCard(
                                icon = Icons.Default.AttachMoney,
                                iconColor = colors.primary,
                                label = "Costo Unitario",
                                value = item.unitCost?.asMXN() ?: "—",
                                subtitle = "por ${item.unit}",
                                iconContentDescription = stringResource(DesignSystemR.string.cd_savings),
                                modifier = Modifier.weight(1f)
                            )
                            InventoryKpiCard(
                                icon = Icons.Default.Assessment,
                                iconColor = colors.primary,
                                label = "Valor en Stock",
                                value = if (item.unitCost != null) uiState.stockValue.asMXN() else "—",
                                subtitle = "valor total",
                                iconContentDescription = stringResource(DesignSystemR.string.cd_visibility),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Stock Health Bars
                        StockHealthBars(
                            currentStock = item.currentStock,
                            minimumStock = item.minimumStock,
                            demand7Days = uiState.demand7Days,
                            isLowStock = uiState.isLowStock,
                            stockAfter7Days = uiState.stockAfter7Days,
                            unit = item.unit,
                            colors = colors
                        )
                    },
                    right = {
                        // Smart Alert
                        SmartStockAlert(
                            demand7Days = uiState.demand7Days,
                            stockAfter7Days = uiState.stockAfter7Days,
                            isLowStock = uiState.isLowStock,
                            currentStock = item.currentStock,
                            minimumStock = item.minimumStock,
                            unit = item.unit,
                            hasDemand = uiState.demandEntries.isNotEmpty(),
                            colors = colors
                        )

                        // Demand Forecast
                        DemandForecastCard(
                            entries = uiState.demandEntries,
                            currentStock = item.currentStock,
                            unit = item.unit,
                            colors = colors
                        )

                        // Adjust stock button
                        Button(
                            onClick = {
                                adjustmentValue = item.currentStock.let {
                                    if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it)
                                }
                                showAdjustSheet = true
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.primary.copy(alpha = 0.1f),
                                contentColor = colors.primary
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Tune,
                                contentDescription = stringResource(DesignSystemR.string.cd_tune),
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Ajustar Stock", fontWeight = FontWeight.SemiBold)
                        }
                    }
                )

                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun InventoryKpiCard(
    icon: ImageVector,
    iconColor: Color,
    label: String,
    value: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    valueColor: Color = SolennixTheme.colors.primaryText,
    extraLabel: String? = null,
    extraColor: Color = SolennixTheme.colors.warning,
    iconContentDescription: String? = null
) {
    Card(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = iconContentDescription,
                    tint = iconColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(label, style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
            }
            Spacer(modifier = Modifier.height(6.6.dp))
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = valueColor, maxLines = 1)
            Text(subtitle, style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
            if (extraLabel != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = stringResource(DesignSystemR.string.cd_warning),
                        tint = extraColor,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(extraLabel, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = extraColor)
                }
            }
        }
    }
}

@Composable
private fun SmartStockAlert(
    demand7Days: Double,
    stockAfter7Days: Double,
    isLowStock: Boolean,
    currentStock: Double,
    minimumStock: Double,
    unit: String,
    hasDemand: Boolean,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    val isCritical = demand7Days > 0 && stockAfter7Days < 0
    val isWarning = demand7Days > 0 && stockAfter7Days >= 0 && stockAfter7Days < minimumStock
    val isLowOnly = isLowStock && demand7Days == 0.0

    val (bgColor, borderColor, iconColor, icon) = when {
        isCritical -> listOf(colors.error.copy(alpha = 0.08f), colors.error.copy(alpha = 0.2f), colors.error, Icons.Default.Warning)
        isWarning -> listOf(Color(0xFFFFF3E0), Color(0xFFFFE0B2), Color(0xFFFF9800), Icons.Default.Warning)
        isLowOnly -> listOf(colors.warning.copy(alpha = 0.08f), colors.warning.copy(alpha = 0.2f), colors.warning, Icons.Default.Warning)
        else -> listOf(Color(0xFFE8F5E9), Color(0xFFC8E6C9), Color(0xFF4CAF50), Icons.Default.CheckCircle)
    }

    Surface(
        shape = MaterialTheme.shapes.medium,
        color = bgColor as Color,
        border = androidx.compose.foundation.BorderStroke(1.dp, borderColor as Color),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(
                imageVector = icon as ImageVector,
                contentDescription = if (icon == Icons.Default.Warning) stringResource(DesignSystemR.string.cd_warning) else stringResource(DesignSystemR.string.cd_check),
                tint = iconColor as Color,
                modifier = Modifier.size(24.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = when {
                        isCritical -> "¡Stock insuficiente para los próximos 7 días!"
                        isWarning -> "Stock quedará bajo el mínimo tras eventos próximos"
                        isLowOnly -> "Stock por debajo del mínimo recomendado"
                        demand7Days > 0 -> "Stock suficiente para los próximos 7 días"
                        hasDemand -> "Sin demanda en los próximos 7 días"
                        else -> "Sin eventos próximos"
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = iconColor
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = when {
                        isCritical -> "Necesitas ${demand7Days.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit en los próximos 7 días. Tienes ${currentStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit. Faltan ${(-stockAfter7Days).let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit."
                        isLowOnly -> "Tu stock actual (${currentStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit) está por debajo del mínimo recomendado (${minimumStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit)."
                        else -> "Stock actual: ${currentStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.secondaryText
                )
            }
        }
    }
}

@Composable
private fun StockHealthBars(
    currentStock: Double,
    minimumStock: Double,
    demand7Days: Double,
    isLowStock: Boolean,
    stockAfter7Days: Double,
    unit: String,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    val maxBar = maxOf(currentStock, minimumStock, demand7Days, 1.0)

    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Stock Actual bar
            HealthBar(
                label = "Stock Actual",
                value = "${currentStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit",
                fraction = (currentStock / maxBar).toFloat().coerceIn(0f, 1f),
                barColor = when {
                    isLowStock && demand7Days > 0 && stockAfter7Days < 0 -> colors.error
                    isLowStock -> colors.warning
                    else -> colors.primary
                }
            )
            // Mínimo bar
            HealthBar(
                label = "Mínimo Recomendado",
                value = "${minimumStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit",
                fraction = (minimumStock / maxBar).toFloat().coerceIn(0f, 1f),
                barColor = Color(0xFFFF9800)
            )
            // Demand bar (only if demand exists)
            if (demand7Days > 0) {
                HealthBar(
                    label = "Demanda próximos 7 días",
                    value = "${demand7Days.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit",
                    fraction = (demand7Days / maxBar).toFloat().coerceIn(0f, 1f),
                    barColor = if (stockAfter7Days < 0) colors.error else Color(0xFFFF9800)
                )
            }
        }
    }
}

@Composable
private fun HealthBar(label: String, value: String, fraction: Float, barColor: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
            Text(value, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primaryText)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(SolennixTheme.colors.surfaceGrouped)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction)
                    .clip(RoundedCornerShape(4.dp))
                    .background(barColor)
            )
        }
    }
}

@Composable
private fun DemandForecastCard(
    entries: List<InventoryDemandEntry>,
    currentStock: Double,
    unit: String,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Demanda por Fecha", style = MaterialTheme.typography.titleMedium, color = colors.primaryText)
                }
                Text("Eventos confirmados", style = MaterialTheme.typography.labelSmall, color = colors.secondaryText)
            }

            if (entries.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(32.dp), tint = colors.tertiaryText)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Sin eventos confirmados que usen este ítem.", style = MaterialTheme.typography.bodySmall, color = colors.secondaryText)
                }
            } else {
                val today = LocalDate.now()
                val dateFormatter = DateTimeFormatter.ofPattern("d 'de' MMMM", Locale("es"))
                var accumulated = currentStock

                entries.forEach { entry ->
                    accumulated -= entry.quantity
                    val eventDate = try { LocalDate.parse(entry.eventDate) } catch (_: Exception) { null }
                    val diffDays = eventDate?.let { ChronoUnit.DAYS.between(today, it).toInt() } ?: Int.MAX_VALUE
                    val isUrgent = accumulated < 0
                    val isWithinWeek = diffDays in 0..7

                    val dotColor = when {
                        isUrgent -> colors.error
                        isWithinWeek -> Color(0xFFFF9800)
                        else -> colors.primary.copy(alpha = 0.4f)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(dotColor))
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    eventDate?.format(dateFormatter) ?: entry.eventDate,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = colors.primaryText
                                )
                                when (diffDays) {
                                    0 -> BadgeLabel("Hoy", colors.primary)
                                    1 -> BadgeLabel("Mañana", Color(0xFFFF9800))
                                    in 2..7 -> Text("en $diffDays días", style = MaterialTheme.typography.labelSmall, color = colors.secondaryText)
                                }
                            }
                        }
                        Text(
                            "${entry.quantity.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (isUrgent) colors.error else colors.primaryText
                        )
                    }
                }

                // Total
                HorizontalDivider(color = colors.divider)
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total demanda", style = MaterialTheme.typography.labelSmall, color = colors.secondaryText)
                    val total = entries.sumOf { it.quantity }
                    Text(
                        "${total.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.primaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun BadgeLabel(text: String, color: Color) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StockAdjustmentSheet(
    itemName: String,
    currentStock: Double,
    unit: String,
    adjustmentValue: String,
    onValueChange: (String) -> Unit,
    onQuickAdjust: (Double) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Ajustar Stock", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(itemName, style = MaterialTheme.typography.titleSmall, color = SolennixTheme.colors.primaryText)
            Text(
                "Stock actual: ${currentStock.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} $unit",
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )

            HorizontalDivider()

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Nuevo stock:", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = adjustmentValue,
                    onValueChange = onValueChange,
                    modifier = Modifier.width(100.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(8.dp)
                )
                Text(unit, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(-10.0, -1.0, 1.0, 10.0).forEach { delta ->
                    OutlinedButton(
                        onClick = { onQuickAdjust(delta) },
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = if (delta > 0) Color(0xFF4CAF50) else SolennixTheme.colors.error
                        )
                    ) {
                        Text(if (delta > 0) "+${delta.toInt()}" else "${delta.toInt()}")
                    }
                }
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancelar") }
                Button(onClick = onSave, modifier = Modifier.weight(1f)) { Text("Guardar") }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}
