package com.creapolis.solennix.feature.products.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveDetailLayout
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.ProductIngredient
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.products.ProductStrings
import com.creapolis.solennix.feature.products.viewmodel.ProductDetailViewModel
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    viewModel: ProductDetailViewModel,
    onNavigateBack: () -> Unit,
    onSearchClick: () -> Unit = {},
    onEditClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showDeleteDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) {
            viewModel.consumeDeleteSuccess()
            onNavigateBack()
        }
    }

    // Surface post-load errors (e.g. delete failure) via Snackbar when product is loaded.
    LaunchedEffect(uiState.errorMessage) {
        val msg = uiState.errorMessage
        if (msg != null && uiState.product != null) {
            snackbarHostState.showSnackbar(msg)
            viewModel.onErrorShown()
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(ProductStrings.deleteTitle) },
            text = { Text(ProductStrings.deleteMessage) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deleteProduct()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                ) {
                    Text(ProductStrings.confirmDelete)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text(ProductStrings.cancel)
                }
            }
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            SolennixTopAppBar(
                title = { Text(ProductStrings.detailTitle) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                },
                actions = {
                    uiState.product?.let { product ->
                        IconButton(onClick = { onEditClick(product.id) }) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = stringResource(DesignSystemR.string.cd_edit)
                            )
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = stringResource(DesignSystemR.string.cd_delete),
                                tint = SolennixTheme.colors.error
                            )
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
        } else if (uiState.errorMessage != null && uiState.product == null) {
            // Full-screen error only on initial load failure. Post-load errors use SnackbarHost.
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(uiState.errorMessage.orEmpty(), color = SolennixTheme.colors.error)
            }
        } else if (uiState.product != null) {
            val product = uiState.product ?: return@Scaffold
            val scrollState = rememberScrollState()
            val demandData by viewModel.demandData.collectAsStateWithLifecycle()
            val colors = SolennixTheme.colors

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Product image
                if (product.imageUrl != null) {
                    AsyncImage(
                        model = UrlResolver.resolve(product.imageUrl),
                        contentDescription = product.name,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(250.dp),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(250.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = product.name.take(1).uppercase(),
                            style = MaterialTheme.typography.displayLarge,
                            color = colors.primary
                        )
                    }
                }

                // Name + Category
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.headlineMedium,
                    color = colors.primaryText
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = colors.primary.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = product.category,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.primary,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    if (!product.isActive) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = colors.error.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = ProductStrings.inactive,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.error,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                AdaptiveDetailLayout(
                    left = {
                        // KPI Cards
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            KpiCard(
                                icon = Icons.Default.AttachMoney,
                                iconColor = colors.primary,
                                label = ProductStrings.basePrice,
                                value = product.basePrice.asMXN(),
                                subtitle = ProductStrings.perUnit,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                icon = Icons.Default.Layers,
                                iconColor = colors.secondaryText,
                                label = ProductStrings.unitCost,
                                value = uiState.unitCost.asMXN(),
                                subtitle = ProductStrings.inSupplies,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val marginValue = uiState.margin
                            // Use semantic theme colors; null margin (no recipe) renders as "—"
                            val marginColor = when {
                                marginValue == null -> colors.secondaryText
                                marginValue >= 50 -> colors.success
                                marginValue >= 20 -> colors.primaryText
                                else -> colors.warning
                            }
                            KpiCard(
                                icon = Icons.AutoMirrored.Filled.TrendingUp,
                                iconColor = marginColor,
                                label = ProductStrings.marginEstimated,
                                value = if (marginValue != null) "%.1f%%".format(marginValue) else "—",
                                subtitle = if (marginValue != null) ProductStrings.marginSubtitle else ProductStrings.noRecipeLabel,
                                valueColor = marginColor,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                icon = Icons.Default.CalendarMonth,
                                iconColor = colors.primary,
                                label = ProductStrings.upcomingEvents,
                                value = "${demandData.size}",
                                subtitle = ProductStrings.confirmed,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Smart Alert — demand windows precomputed here using the VM's
                        // anchored 'today' to avoid repeated LocalDate.now() + parse on
                        // every recomposition (fix #12).
                        val today = viewModel.todayDate
                        val in7Days = today.plusDays(7)
                        val demand7Days = demandData.filter { dp ->
                            try {
                                val date = java.time.LocalDate.parse(dp.eventDate)
                                !date.isBefore(today) && !date.isAfter(in7Days)
                            } catch (_: Exception) { false }
                        }.sumOf { it.quantity }
                        val totalDemand = demandData.sumOf { it.quantity }
                        val estimatedRevenue = demandData.sumOf { dp ->
                            if (dp.unitPrice > 0) dp.revenue else dp.quantity * product.basePrice
                        }
                        SmartAlertSection(
                            demand7Days = demand7Days,
                            totalDemand = totalDemand,
                            estimatedRevenue = estimatedRevenue,
                            demandDataSize = demandData.size,
                            colors = colors
                        )

                        // General Info Card
                        GeneralInfoCard(
                            category = product.category,
                            basePrice = product.basePrice,
                            ingredientCount = uiState.ingredientItems.size,
                            supplyCount = uiState.supplyItems.size,
                            equipmentCount = uiState.equipmentItems.size,
                            colors = colors
                        )
                    },
                    right = {
                        // Composition / Ingredients table
                        if (uiState.ingredientItems.isNotEmpty()) {
                            CompositionSection(
                                title = ProductStrings.compositionTitle,
                                icon = Icons.Default.Layers,
                                iconColor = colors.primary,
                                items = uiState.ingredientItems,
                                showCost = true,
                                totalLabel = ProductStrings.totalUnitCost,
                                totalValue = uiState.unitCost,
                                colors = colors
                            )
                        }

                        // Per-event supplies table
                        if (uiState.supplyItems.isNotEmpty()) {
                            CompositionSection(
                                title = ProductStrings.suppliesTitle,
                                icon = Icons.Default.LocalGasStation,
                                iconColor = Color(0xFFFF9800),
                                items = uiState.supplyItems,
                                showCost = true,
                                badge = ProductStrings.fixedCostPerEvent,
                                badgeColor = Color(0xFFFF9800),
                                totalLabel = ProductStrings.totalEventCost,
                                totalValue = uiState.perEventCost,
                                totalValueColor = Color(0xFFFF9800),
                                colors = colors
                            )
                        }

                        // Equipment table
                        if (uiState.equipmentItems.isNotEmpty()) {
                            CompositionSection(
                                title = ProductStrings.equipmentTitle,
                                icon = Icons.Default.Build,
                                iconColor = Color(0xFF2196F3),
                                items = uiState.equipmentItems,
                                showCost = false,
                                badge = ProductStrings.reusableNoCost,
                                badgeColor = Color(0xFF2196F3),
                                colors = colors
                            )
                        }

                        // Demand Forecast Chart
                        DemandForecastChart(
                            dataPoints = demandData,
                            productName = product.name,
                            basePrice = product.basePrice
                        )
                    }
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun KpiCard(
    icon: ImageVector,
    iconColor: Color,
    label: String,
    value: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    valueColor: Color = SolennixTheme.colors.primaryText
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
                    icon,
                    contentDescription = stringResource(DesignSystemR.string.cd_visibility),
                    tint = iconColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
                color = valueColor
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText
            )
        }
    }
}

@Composable
private fun SmartAlertSection(
    demand7Days: Double,
    totalDemand: Double,
    estimatedRevenue: Double,
    demandDataSize: Int,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    val isHighDemand = demand7Days > 0
    val bgColor = if (isHighDemand) colors.primary.copy(alpha = 0.08f) else colors.card
    val borderColor = if (isHighDemand) colors.primary.copy(alpha = 0.2f) else colors.divider

    // Format demand7Days with up to 2 fraction digits, dropping trailing zeros
    fun formatQty(qty: Double): String = if (qty == qty.toLong().toDouble()) {
        qty.toLong().toString()
    } else "%.2f".format(qty).trimEnd('0').trimEnd('.')

    Surface(
        shape = MaterialTheme.shapes.medium,
        color = bgColor,
        border = androidx.compose.foundation.BorderStroke(1.dp, borderColor),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = if (isHighDemand) Icons.Default.Warning else Icons.Default.CheckCircle,
                contentDescription = stringResource(
                    if (isHighDemand) DesignSystemR.string.cd_warning else DesignSystemR.string.cd_check
                ),
                tint = if (isHighDemand) colors.primary else Color(0xFF4CAF50),
                modifier = Modifier.size(24.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = when {
                        isHighDemand -> ProductStrings.unitsNext7Days(formatQty(demand7Days))
                        demandDataSize > 0 -> ProductStrings.noImmediateDemand
                        else -> ProductStrings.noUpcomingEvents
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isHighDemand) colors.primary else Color(0xFF4CAF50)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = when {
                        isHighDemand && estimatedRevenue > 0 ->
                            ProductStrings.totalRevenueMessage(estimatedRevenue.asMXN())
                        isHighDemand -> ProductStrings.highDemandThisWeek
                        demandDataSize > 0 ->
                            ProductStrings.upcomingEventsSummary(formatQty(totalDemand), demandDataSize)
                        else -> ProductStrings.noConfirmedEventsIncludingProduct
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.secondaryText
                )
            }
        }
    }
}

@Composable
private fun GeneralInfoCard(
    category: String,
    basePrice: Double,
    ingredientCount: Int,
    supplyCount: Int,
    equipmentCount: Int,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = ProductStrings.generalInfo,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = colors.secondaryText
            )
            InfoRow(Icons.AutoMirrored.Filled.Label, ProductStrings.category, category, colors)
            HorizontalDivider(color = colors.divider)
            InfoRow(Icons.Default.AttachMoney, ProductStrings.basePrice, basePrice.asMXN(), colors)
            HorizontalDivider(color = colors.divider)

            val compositionText = buildString {
                append("$ingredientCount ${ProductStrings.composition.lowercase()}")
                if (supplyCount > 0) append(", $supplyCount ${ProductStrings.suppliesTitle.lowercase()}")
                if (equipmentCount > 0) append(", $equipmentCount ${ProductStrings.equipmentTitle.lowercase()}")
            }
            InfoRow(Icons.Default.Layers, ProductStrings.composition, compositionText, colors)
        }
    }
}

@Composable
private fun InfoRow(
    icon: ImageVector,
    label: String,
    value: String,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(
            icon,
            contentDescription = stringResource(DesignSystemR.string.cd_category),
            tint = colors.primary,
            modifier = Modifier.size(20.dp)
        )
        Column {
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = colors.secondaryText)
            Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = colors.primaryText)
        }
    }
}

@Composable
private fun CompositionSection(
    title: String,
    icon: ImageVector,
    iconColor: Color,
    items: List<ProductIngredient>,
    showCost: Boolean,
    badge: String? = null,
    badgeColor: Color = SolennixTheme.colors.primary,
    totalLabel: String? = null,
    totalValue: Double? = null,
    totalValueColor: Color = SolennixTheme.colors.primaryText,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        icon,
                        contentDescription = stringResource(DesignSystemR.string.cd_visibility),
                        tint = iconColor,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.primaryText
                    )
                }
                if (badge != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = badgeColor.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = badge,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = badgeColor,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            HorizontalDivider(color = colors.divider)

            // Table header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surfaceGrouped)
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text(
                    text = ProductStrings.ingredientHeader,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.secondaryText,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = ProductStrings.quantityHeader,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.secondaryText
                )
                if (showCost) {
                    Spacer(modifier = Modifier.width(24.dp))
                    Text(
                        text = ProductStrings.estimatedCostHeader,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.secondaryText
                    )
                }
            }

            // Rows
            items.forEach { ingredient ->
                HorizontalDivider(color = colors.divider.copy(alpha = 0.5f))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = ingredient.ingredientName ?: ProductStrings.unknownIngredient,
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.primaryText,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "${ingredient.quantityRequired.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} ${ingredient.unit ?: ""}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.primaryText
                    )
                    if (showCost) {
                        Spacer(modifier = Modifier.width(24.dp))
                        val cost = ingredient.unitCost?.let { it * ingredient.quantityRequired }
                        Text(
                            text = cost?.asMXN() ?: "—",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = if (totalValueColor != colors.primaryText) totalValueColor else colors.primaryText
                        )
                    }
                }
            }

            // Total footer
            if (totalLabel != null && totalValue != null) {
                HorizontalDivider(color = colors.divider)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = totalLabel,
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.secondaryText
                    )
                    Text(
                        text = totalValue.asMXN(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = totalValueColor
                    )
                }
            }
        }
    }
}
