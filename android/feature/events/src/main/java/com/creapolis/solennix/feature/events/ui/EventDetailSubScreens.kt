package com.creapolis.solennix.feature.events.ui

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.SupplySource
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.formatQuantity
import com.creapolis.solennix.core.model.extensions.toPaymentMethodLabel
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel

// ==================== Finances Detail Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventFinancesScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Finanzas") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val event = uiState.event
        if (event == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        val netSales = event.totalAmount - event.taxAmount
        val supplyCost = uiState.supplies.sumOf { it.quantity * it.unitCost }
        val profit = netSales - supplyCost
        val margin = if (netSales > 0) (profit / netSales) * 100 else 0.0
        val totalPaid = uiState.totalPaid
        val remaining = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
        val progress = if (event.totalAmount > 0) (totalPaid / event.totalAmount).coerceIn(0.0, 1.0) else 0.0
        val depositAmount = event.totalAmount * ((event.depositPercent ?: 0.0) / 100)
        val isDepositMet = totalPaid >= (depositAmount - 0.1)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Total prominent
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(
                    modifier = Modifier.padding(24.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("TOTAL COBRADO", style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
                    Text(
                        event.totalAmount.asMXN(),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Black,
                        color = SolennixTheme.colors.primary
                    )
                }
            }

            // Financial breakdown
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    FinancialMetricRow("Venta Bruta", netSales.asMXN())

                    if (event.taxAmount > 0) {
                        FinancialMetricRow("IVA (${event.taxRate.toInt()}%)", event.taxAmount.asMXN())
                    }

                    FinancialMetricRow("Total Cobrado", event.totalAmount.asMXN(), SolennixTheme.colors.primary, true)

                    if (event.depositPercent != null && event.depositPercent!! > 0) {
                        FinancialMetricRow(
                            "Anticipo (${event.depositPercent!!.toInt()}%)",
                            depositAmount.asMXN(),
                            if (isDepositMet) SolennixTheme.colors.success else SolennixTheme.colors.warning
                        )
                    }

                    if (event.discount > 0) {
                        val discountLabel = if (event.discountType == DiscountType.PERCENT)
                            "Descuento (${event.discount.toInt()}%)" else "Descuento"
                        val discountAmount = if (event.discountType == DiscountType.PERCENT)
                            netSales * event.discount / 100 else event.discount
                        FinancialMetricRow(discountLabel, "-${discountAmount.asMXN()}", SolennixTheme.colors.error)
                    }

                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f)
                    )

                    FinancialMetricRow("Costos", supplyCost.asMXN(), SolennixTheme.colors.error)
                    FinancialMetricRow("Utilidad Neta", profit.asMXN(), SolennixTheme.colors.success, true)
                    FinancialMetricRow("Margen", "${margin.toInt()}%", SolennixTheme.colors.info, true)

                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f)
                    )

                    FinancialMetricRow("Pagado", totalPaid.asMXN(), SolennixTheme.colors.success)
                    FinancialMetricRow(
                        "Pendiente",
                        remaining.asMXN(),
                        if (remaining > 0) SolennixTheme.colors.error else SolennixTheme.colors.success,
                        true
                    )
                }
            }

            // Payment progress
            if (event.totalAmount > 0) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Progreso de Cobro", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primary)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { progress.toFloat() },
                            modifier = Modifier.fillMaxWidth().height(12.dp),
                            color = SolennixTheme.colors.primary,
                            trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.15f),
                            strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(totalPaid.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.success)
                            Text(event.totalAmount.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FinancialMetricRow(
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = SolennixTheme.colors.primaryText,
    isBold: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = if (isBold) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isBold) FontWeight.SemiBold else FontWeight.Normal,
            color = SolennixTheme.colors.secondaryText
        )
        Text(
            value,
            style = if (isBold) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = valueColor
        )
    }
}

// ==================== Payments Detail Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventPaymentsScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showPaymentModal by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Pagos") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val event = uiState.event
        if (event == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        val totalPaid = uiState.totalPaid
        val remaining = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
        val progress = if (event.totalAmount > 0) (totalPaid / event.totalAmount).coerceIn(0.0, 1.0) else 0.0

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // KPIs
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("Total", event.totalAmount.asMXN(), SolennixTheme.colors.primary, Modifier.weight(1f))
                KpiCard("Pagado", totalPaid.asMXN(), SolennixTheme.colors.success, Modifier.weight(1f))
                KpiCard("Saldo", remaining.asMXN(), if (remaining <= 0.01) SolennixTheme.colors.success else SolennixTheme.colors.error, Modifier.weight(1f))
            }

            // Progress
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    LinearProgressIndicator(
                        progress = { progress.toFloat() },
                        modifier = Modifier.fillMaxWidth().height(12.dp),
                        color = SolennixTheme.colors.primary,
                        trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.15f),
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${(progress * 100).toInt()}% cobrado", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                }
            }

            // Action buttons
            if (remaining > 0.01) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PremiumButton(
                        text = "Registrar Pago",
                        onClick = { showPaymentModal = true },
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Add
                    )
                }
            }

            // Payment history
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Historial de Pagos", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (uiState.payments.isEmpty()) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.Payments, contentDescription = null, tint = SolennixTheme.colors.secondaryText, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("No hay pagos registrados", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                        }
                    } else {
                        uiState.payments.forEach { payment ->
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.surface),
                                shape = MaterialTheme.shapes.medium
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(payment.paymentDate, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                        Text(
                                            payment.paymentMethod.toPaymentMethodLabel(),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                        if (!payment.notes.isNullOrEmpty()) {
                                            Text(payment.notes.orEmpty(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                                        }
                                    }
                                    Text(payment.amount.asMXN(), style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.success, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    IconButton(
                                        onClick = { viewModel.deletePayment(payment.id) },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = SolennixTheme.colors.error, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (showPaymentModal) {
            PaymentModal(
                remaining = remaining,
                onDismiss = { showPaymentModal = false },
                onConfirm = { amount, method, notes, date ->
                    viewModel.addPayment(amount, method, notes, date)
                    showPaymentModal = false
                    Toast.makeText(context, "Pago registrado", Toast.LENGTH_SHORT).show()
                }
            )
        }
    }
}

@Composable
private fun KpiCard(
    label: String,
    value: String,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = color.copy(alpha = 0.1f)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = color, maxLines = 1)
            Text(label, style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
        }
    }
}

// ==================== Products Detail Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventProductsScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Productos") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val products = uiState.products
        val subtotal = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (products.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text("Sin productos asignados", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                // Summary
                Surface(shape = MaterialTheme.shapes.medium, color = SolennixTheme.colors.primary.copy(alpha = 0.1f)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${products.size} productos", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                        Text("Subtotal: ${subtotal.asMXN()}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primary)
                    }
                }

                products.forEach { product ->
                    val name = uiState.productNames[product.productId] ?: "Producto"
                    val total = product.totalPrice ?: (product.quantity * product.unitPrice)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Text("${product.quantity.formatQuantity()} x ${product.unitPrice.asMXN()}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                            }
                            Text(total.asMXN(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// ==================== Extras Detail Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventExtrasScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Extras") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val extras = uiState.extras
        val subtotal = extras.sumOf { it.price }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (extras.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text("Sin extras asignados", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                Surface(shape = MaterialTheme.shapes.medium, color = SolennixTheme.colors.info.copy(alpha = 0.1f)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${extras.size} extras", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                        Text("Subtotal: ${subtotal.asMXN()}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.info)
                    }
                }

                extras.forEach { extra ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(extra.description, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(extra.price.asMXN(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// ==================== Supplies Detail Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventSuppliesScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Insumos del Evento") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val supplies = uiState.supplies
        val totalCost = supplies.sumOf { it.quantity * it.unitCost }
        val stockCount = supplies.count { it.source == SupplySource.STOCK }
        val purchaseCount = supplies.count { it.source == SupplySource.PURCHASE }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (supplies.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text("Sin insumos asignados", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                // Summary
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard("Total", "${supplies.size}", SolennixTheme.colors.warning, Modifier.weight(1f))
                    KpiCard("Stock", "$stockCount", SolennixTheme.colors.success, Modifier.weight(1f))
                    KpiCard("Compra", "$purchaseCount", SolennixTheme.colors.error, Modifier.weight(1f))
                    KpiCard("Costo", totalCost.asMXN(), SolennixTheme.colors.warning, Modifier.weight(1f))
                }

                supplies.forEach { supply ->
                    val sourceLabel = when (supply.source) {
                        SupplySource.STOCK -> "Almacen"
                        SupplySource.PURCHASE -> "Compra"
                    }
                    val sourceColor = when (supply.source) {
                        SupplySource.STOCK -> SolennixTheme.colors.success
                        SupplySource.PURCHASE -> SolennixTheme.colors.warning
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(supply.supplyName ?: "Insumo", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Surface(shape = MaterialTheme.shapes.small, color = sourceColor.copy(alpha = 0.12f)) {
                                    Text(sourceLabel, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = sourceColor)
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text((supply.quantity * supply.unitCost).asMXN(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                Text("${supply.quantity.formatQuantity()} x ${supply.unitCost.asMXN()}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== Equipment Detail Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventEquipmentScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Equipo Asignado") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val equipment = uiState.equipment

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (equipment.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text("Sin equipo asignado", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                Surface(shape = MaterialTheme.shapes.medium, color = SolennixTheme.colors.success.copy(alpha = 0.1f)) {
                    Text(
                        "${equipment.size} equipos asignados",
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }

                equipment.forEach { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.equipmentName ?: "Equipo", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                if (!item.notes.isNullOrEmpty()) {
                                    Text(item.notes!!, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                                }
                            }
                            Surface(shape = MaterialTheme.shapes.small, color = SolennixTheme.colors.success.copy(alpha = 0.1f)) {
                                Text(
                                    "x${item.quantity}",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = SolennixTheme.colors.success
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== Shopping List Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventShoppingListScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Lista de Compras") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        val event = uiState.event
        val supplies = uiState.supplies
        val purchaseSupplies = supplies.filter { it.source == SupplySource.PURCHASE }
        val stockSupplies = supplies.filter { it.source == SupplySource.STOCK }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            if (event != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp).fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("LISTA DE INSUMOS", style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
                        Text(event.serviceType, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(event.eventDate, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                    }
                }
            }

            // Purchase supplies
            if (purchaseSupplies.isNotEmpty()) {
                Text("Insumos por Comprar", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                purchaseSupplies.forEach { supply ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.error.copy(alpha = 0.05f)),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(supply.supplyName ?: "Insumo", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Text("${supply.quantity.formatQuantity()} ${supply.unit ?: "und"}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                            }
                            Text(
                                (supply.quantity * supply.unitCost).asMXN(),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = SolennixTheme.colors.warning
                            )
                        }
                    }
                }
            }

            // Stock supplies
            if (stockSupplies.isNotEmpty()) {
                Text("Del Stock", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                stockSupplies.forEach { supply ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(supply.supplyName ?: "Insumo", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                            Text("x${supply.quantity.formatQuantity()}", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.success, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }

            if (purchaseSupplies.isEmpty() && stockSupplies.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = SolennixTheme.colors.secondaryText, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Sin compras requeridas", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                    }
                }
            }
        }
    }
}

// ==================== Contract Preview Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventContractPreviewScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = "Contrato",
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver")
                    }
                },
                actions = {
                    val event = uiState.event
                    val user = uiState.currentUser
                    if (event != null) {
                        IconButton(onClick = {
                            val client = uiState.client ?: return@IconButton
                            val file = com.creapolis.solennix.feature.events.pdf.ContractPdfGenerator.generate(
                                context = context,
                                event = event,
                                client = client,
                                products = uiState.products,
                                extras = uiState.extras,
                                user = user
                            )
                            val uri = androidx.core.content.FileProvider.getUriForFile(
                                context, "${context.packageName}.fileprovider", file
                            )
                            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                type = "application/pdf"
                                putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            context.startActivity(android.content.Intent.createChooser(shareIntent, "Compartir Contrato"))
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Compartir PDF")
                        }
                    }
                }
            )
        }
    ) { padding ->
        val event = uiState.event
        if (event == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        val user = uiState.currentUser
        val totalPaid = uiState.totalPaid
        val depositPercent = event.depositPercent ?: user?.defaultDepositPercent ?: 0.0
        val depositAmount = event.totalAmount * (depositPercent / 100)
        val isDepositMet = depositPercent == 0.0 || totalPaid >= depositAmount

        if (!isDepositMet) {
            // Deposit gate
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Default.Lock,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = SolennixTheme.colors.warning
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    "ANTICIPO REQUERIDO",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = SolennixTheme.colors.text
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Para visualizar y generar el contrato, es necesario cubrir el anticipo mínimo del ${depositPercent.toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.textSecondary,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                val remaining = maxOf(depositAmount - totalPaid, 0.0)
                Text(
                    "Faltan ${remaining.asMXN} por cobrar.",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.warning
                )
            }
        } else {
            // Render contract template
            val result = renderContractTemplate(event, uiState.client, user, uiState.products, totalPaid)

            if (result.missingTokens.isNotEmpty()) {
                // Missing fields
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = SolennixTheme.colors.error
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Faltan datos para el contrato",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.text
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Completa estos campos en el evento o cliente:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.textSecondary,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            result.missingTokens.forEach { token ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(vertical = 2.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Cancel,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.error,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(token, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            } else {
                // Contract preview
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(12.dp)
                ) {
                    Card(
                        modifier = Modifier.fillMaxSize(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.large,
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .verticalScroll(rememberScrollState())
                                .padding(20.dp)
                        ) {
                            val paragraphs = result.text.split("\n")
                            paragraphs.forEach { paragraph ->
                                val trimmed = paragraph.trim()
                                if (trimmed.isEmpty()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                } else if (isContractHeading(trimmed)) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        trimmed,
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = SolennixTheme.colors.text
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                } else {
                                    Text(
                                        trimmed,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.text,
                                        lineHeight = MaterialTheme.typography.bodySmall.lineHeight * 1.4
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                }
                            }

                            // Signature boxes
                            Spacer(modifier = Modifier.height(40.dp))
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Spacer(modifier = Modifier.height(32.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        user?.businessName ?: user?.name ?: "EL PROVEEDOR",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text("Firma", style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.textTertiary)
                                }
                                Spacer(modifier = Modifier.width(24.dp))
                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Spacer(modifier = Modifier.height(32.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        uiState.client?.name ?: "EL CLIENTE",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text("Firma de EL CLIENTE", style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.textTertiary)
                                }
                            }
                            Spacer(modifier = Modifier.height(24.dp))
                        }
                    }
                }
            }
        }
    }
}

private data class ContractRenderResult(val text: String, val missingTokens: List<String>)

private fun renderContractTemplate(
    event: com.creapolis.solennix.core.model.Event,
    client: com.creapolis.solennix.core.model.Client?,
    user: com.creapolis.solennix.core.model.User?,
    products: List<com.creapolis.solennix.core.model.EventProduct>,
    totalPaid: Double
): ContractRenderResult {
    val template = user?.contractTemplate?.takeIf { it.isNotBlank() } ?: DEFAULT_CONTRACT_TEMPLATE

    val depositPercent = event.depositPercent ?: user?.defaultDepositPercent ?: 0.0
    val depositAmount = event.totalAmount * (depositPercent / 100)
    val cancellationDays = event.cancellationDays ?: user?.defaultCancellationDays ?: 0.0
    val refundPercent = event.refundPercent ?: user?.defaultRefundPercent ?: 0.0
    val discountValue = if (event.discountType == DiscountType.PERCENT) {
        event.totalAmount * (event.discount / 100) / maxOf(1 - event.discount / 100 + event.taxRate / 100, 0.01)
    } else {
        event.discount
    }

    val eventDate = try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale("es", "MX"))
        val display = java.text.SimpleDateFormat("d 'de' MMMM, yyyy", java.util.Locale("es", "MX"))
        val date = sdf.parse(event.eventDate.take(10))
        if (date != null) display.format(date) else event.eventDate
    } catch (_: Exception) { event.eventDate }

    val today = java.text.SimpleDateFormat("d 'de' MMMM, yyyy", java.util.Locale("es", "MX")).format(java.util.Date())

    val servicesList = if (products.isNotEmpty()) {
        products.joinToString(", ") { "${it.quantity} ${it.productName ?: "Producto"}" }
    } else null

    val tokens: List<Pair<String, String?>> = listOf(
        "[Nombre del cliente]" to client?.name,
        "[Teléfono del cliente]" to client?.phone,
        "[Email del cliente]" to client?.email,
        "[Dirección del cliente]" to client?.address,
        "[Ciudad del cliente]" to client?.city,
        "[Fecha del evento]" to eventDate,
        "[Hora de inicio]" to event.startTime,
        "[Hora de fin]" to event.endTime,
        "[Horario del evento]" to run {
            val s = event.startTime; val e = event.endTime
            if (s != null && e != null) "$s - $e" else s ?: e
        },
        "[Tipo de servicio]" to event.serviceType,
        "[Número de personas]" to event.numPeople.toString(),
        "[Ubicación del evento]" to event.location,
        "[Lugar del evento]" to event.location,
        "[Ciudad del evento]" to event.city,
        "[Monto total del evento]" to event.totalAmount.asMXN,
        "[Subtotal del evento]" to (event.totalAmount - event.taxAmount + discountValue).asMXN,
        "[Descuento del evento]" to discountValue.asMXN,
        "[IVA del evento]" to event.taxAmount.asMXN,
        "[Porcentaje de anticipo]" to "${depositPercent.toInt()}%",
        "[Monto de anticipo]" to depositAmount.asMXN,
        "[Total pagado]" to totalPaid.asMXN,
        "[Días de cancelación]" to "${cancellationDays.toInt()}",
        "[Porcentaje de reembolso]" to "${refundPercent.toInt()}%",
        "[Nombre del negocio]" to (user?.businessName ?: user?.name),
        "[Nombre comercial del proveedor]" to (user?.businessName ?: user?.name),
        "[Nombre del proveedor]" to user?.name,
        "[Email del proveedor]" to user?.email,
        "[Fecha actual]" to today,
        "[Ciudad del contrato]" to (event.city ?: client?.city),
        "[Notas del evento]" to event.notes,
        "[Servicios del evento]" to servicesList,
    )

    var result = template
    val missingTokens = mutableListOf<String>()

    tokens.forEach { (token, value) ->
        if (value != null && value.isNotEmpty()) {
            result = result.replace(token, value)
        } else if (template.contains(token)) {
            missingTokens.add(token)
        }
    }

    return ContractRenderResult(result, missingTokens)
}

private fun isContractHeading(text: String): Boolean {
    val upper = text.uppercase()
    return (text == upper && text.length in 4..79) ||
        text.startsWith("PRIMERA") ||
        text.startsWith("SEGUNDA") ||
        text.startsWith("TERCERA") ||
        text.startsWith("CUARTA") ||
        text.startsWith("QUINTA") ||
        text.startsWith("SEXTA") ||
        text.startsWith("CLÁUSULA")
}

private const val DEFAULT_CONTRACT_TEMPLATE = """CONTRATO DE PRESTACIÓN DE SERVICIOS

En la ciudad de [Ciudad del evento], a [Fecha actual], comparecen por una parte [Nombre del negocio], en lo sucesivo "EL PROVEEDOR", y por otra parte [Nombre del cliente], en lo sucesivo "EL CLIENTE".

DECLARACIONES

EL PROVEEDOR declara que cuenta con la capacidad y experiencia para proporcionar servicios de [Tipo de servicio].

EL CLIENTE declara que requiere los servicios de EL PROVEEDOR para el evento a celebrarse el día [Fecha del evento] en [Ubicación del evento].

CLÁUSULAS

PRIMERA. OBJETO DEL CONTRATO
EL PROVEEDOR se compromete a prestar servicios de [Tipo de servicio] para [Número de personas] personas el día [Fecha del evento], con horario de [Hora de inicio] a [Hora de fin].

SEGUNDA. PRECIO Y FORMA DE PAGO
El precio total de los servicios será de [Monto total del evento]. EL CLIENTE deberá cubrir un anticipo del [Porcentaje de anticipo] ([Monto de anticipo]) al momento de la firma del presente contrato. El saldo restante deberá cubrirse a más tardar el día del evento.

TERCERA. CANCELACIÓN
En caso de cancelación por parte de EL CLIENTE con menos de [Días de cancelación] días de anticipación, EL PROVEEDOR reembolsará el [Porcentaje de reembolso] del anticipo.

CUARTA. OBLIGACIONES DEL PROVEEDOR
EL PROVEEDOR se obliga a proporcionar los servicios pactados en tiempo y forma, conforme a las especificaciones acordadas.

QUINTA. OBLIGACIONES DEL CLIENTE
EL CLIENTE se obliga a realizar los pagos en los plazos acordados y a proporcionar las facilidades necesarias para la prestación del servicio.

Leído el presente contrato, ambas partes lo firman de conformidad."""

