package com.creapolis.solennix.feature.clients.ui

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.QuickQuoteDataHolder
import com.creapolis.solennix.core.model.QuickQuoteTransferData
import com.creapolis.solennix.core.model.QuoteTransferExtra
import com.creapolis.solennix.core.model.QuoteTransferProduct
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.clients.viewmodel.QuickQuoteViewModel
import com.creapolis.solennix.feature.clients.viewmodel.QuoteExtra
import com.creapolis.solennix.feature.clients.viewmodel.QuoteItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickQuoteScreen(
    viewModel: QuickQuoteViewModel,
    onNavigateBack: () -> Unit,
    onConvertToEvent: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val isWideScreen = LocalIsWideScreen.current

    // Share PDF when generated
    LaunchedEffect(uiState.generatedPdfFile) {
        uiState.generatedPdfFile?.let { file ->
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Compartir Cotizacion"))
            viewModel.clearPdfFile()
        }
    }

    // Show error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cotizacion Rapida") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = SolennixTheme.colors.primary)
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
                // Client info
                if (uiState.client != null) {
                    val client = uiState.client!!
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = SolennixTheme.colors.primary
                            )
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = client.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Text(
                                    text = client.phone,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                        }
                    }
                } else {
                    // Ad-hoc client info (collapsible, optional)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.toggleClientInfo() },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Datos del cliente (opcional)",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    Text(
                                        text = "Para incluir en el PDF",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }
                                Icon(
                                    imageVector = if (uiState.showClientInfo) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    contentDescription = if (uiState.showClientInfo) "Colapsar" else "Expandir",
                                    tint = SolennixTheme.colors.secondaryText
                                )
                            }

                            AnimatedVisibility(visible = uiState.showClientInfo) {
                                Column(
                                    modifier = Modifier.padding(top = 12.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    AdaptiveFormRow(
                                        spacing = 12.dp,
                                        left = {
                                            OutlinedTextField(
                                                value = uiState.clientName,
                                                onValueChange = viewModel::updateClientName,
                                                label = { Text("Nombre") },
                                                modifier = Modifier.fillMaxWidth(),
                                                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                                                singleLine = true
                                            )
                                        },
                                        right = {
                                            OutlinedTextField(
                                                value = uiState.clientPhone,
                                                onValueChange = viewModel::updateClientPhone,
                                                label = { Text("Teléfono") },
                                                modifier = Modifier.fillMaxWidth(),
                                                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                                singleLine = true
                                            )
                                        }
                                    )
                                    OutlinedTextField(
                                        value = uiState.clientEmail,
                                        onValueChange = viewModel::updateClientEmail,
                                        label = { Text("Email") },
                                        modifier = Modifier.fillMaxWidth(),
                                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                        singleLine = true
                                    )
                                }
                            }
                        }
                    }
                }

                // Number of people
                OutlinedTextField(
                    value = uiState.numPeople,
                    onValueChange = viewModel::updateNumPeople,
                    label = { Text("Numero de Personas") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    leadingIcon = { Icon(Icons.Default.Group, contentDescription = null) }
                )

                // Products section
                SectionHeader(
                    title = "Productos",
                    onAddClick = viewModel::addItem
                )

                if (isWideScreen) {
                    uiState.selectedItems.chunked(2).forEach { rowItems ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            rowItems.forEach { item ->
                                Box(modifier = Modifier.weight(1f)) {
                                    ProductItemCard(
                                        item = item,
                                        products = uiState.products,
                                        onProductSelected = { product -> viewModel.updateItemProduct(item.id, product) },
                                        onQuantityChanged = { qty -> viewModel.updateItemQuantity(item.id, qty) },
                                        onPriceChanged = { price -> viewModel.updateItemPrice(item.id, price) },
                                        onRemove = { viewModel.removeItem(item.id) },
                                        canRemove = uiState.selectedItems.size > 1
                                    )
                                }
                            }
                            if (rowItems.size == 1) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    uiState.selectedItems.forEach { item ->
                        ProductItemCard(
                            item = item,
                            products = uiState.products,
                            onProductSelected = { product -> viewModel.updateItemProduct(item.id, product) },
                            onQuantityChanged = { qty -> viewModel.updateItemQuantity(item.id, qty) },
                            onPriceChanged = { price -> viewModel.updateItemPrice(item.id, price) },
                            onRemove = { viewModel.removeItem(item.id) },
                            canRemove = uiState.selectedItems.size > 1
                        )
                    }
                }

                // Extras section
                SectionHeader(
                    title = "Extras",
                    onAddClick = viewModel::addExtra
                )

                if (uiState.extras.isEmpty()) {
                    Text(
                        text = "Sin extras agregados",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }

                if (isWideScreen) {
                    uiState.extras.chunked(2).forEach { rowExtras ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            rowExtras.forEach { extra ->
                                Box(modifier = Modifier.weight(1f)) {
                                    ExtraItemCard(
                                        extra = extra,
                                        onDescriptionChanged = { desc -> viewModel.updateExtraDescription(extra.id, desc) },
                                        onCostChanged = { cost -> viewModel.updateExtraCost(extra.id, cost) },
                                        onPriceChanged = { price -> viewModel.updateExtraPrice(extra.id, price) },
                                        onExcludeUtilityChanged = { value -> viewModel.updateExtraExcludeUtility(extra.id, value) },
                                        onRemove = { viewModel.removeExtra(extra.id) }
                                    )
                                }
                            }
                            if (rowExtras.size == 1) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    uiState.extras.forEach { extra ->
                        ExtraItemCard(
                            extra = extra,
                            onDescriptionChanged = { desc -> viewModel.updateExtraDescription(extra.id, desc) },
                            onCostChanged = { cost -> viewModel.updateExtraCost(extra.id, cost) },
                            onPriceChanged = { price -> viewModel.updateExtraPrice(extra.id, price) },
                            onExcludeUtilityChanged = { value -> viewModel.updateExtraExcludeUtility(extra.id, value) },
                            onRemove = { viewModel.removeExtra(extra.id) }
                        )
                    }
                }

                // Invoice toggle & Discount section
                if (isWideScreen) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Invoice toggle
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Incluir factura (IVA)",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    Switch(
                                        checked = uiState.requiresInvoice,
                                        onCheckedChange = viewModel::updateRequiresInvoice,
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = SolennixTheme.colors.primary,
                                            checkedTrackColor = SolennixTheme.colors.primaryLight
                                        )
                                    )
                                }

                                if (uiState.requiresInvoice) {
                                    Spacer(Modifier.height(8.dp))
                                    OutlinedTextField(
                                        value = uiState.taxRate,
                                        onValueChange = viewModel::updateTaxRate,
                                        label = { Text("Tasa de IVA (%)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }
                        }

                        // Discount section
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Descuento",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Spacer(Modifier.height(8.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    FilterChip(
                                        selected = uiState.discountType == DiscountType.PERCENT,
                                        onClick = { viewModel.updateDiscountType(DiscountType.PERCENT) },
                                        label = { Text("Porcentaje") },
                                        modifier = Modifier.weight(1f)
                                    )
                                    FilterChip(
                                        selected = uiState.discountType == DiscountType.FIXED,
                                        onClick = { viewModel.updateDiscountType(DiscountType.FIXED) },
                                        label = { Text("Monto fijo") },
                                        modifier = Modifier.weight(1f)
                                    )
                                }

                                Spacer(Modifier.height(8.dp))

                                OutlinedTextField(
                                    value = uiState.discount,
                                    onValueChange = viewModel::updateDiscount,
                                    label = {
                                        Text(
                                            if (uiState.discountType == DiscountType.PERCENT) "Descuento (%)"
                                            else "Descuento ($)"
                                        )
                                    },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                } else {
                    // Invoice toggle
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Incluir factura (IVA)",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Switch(
                                    checked = uiState.requiresInvoice,
                                    onCheckedChange = viewModel::updateRequiresInvoice,
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = SolennixTheme.colors.primary,
                                        checkedTrackColor = SolennixTheme.colors.primaryLight
                                    )
                                )
                            }

                            if (uiState.requiresInvoice) {
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = uiState.taxRate,
                                    onValueChange = viewModel::updateTaxRate,
                                    label = { Text("Tasa de IVA (%)") },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }

                    // Discount section
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Descuento",
                                style = MaterialTheme.typography.titleSmall,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(Modifier.height(8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                FilterChip(
                                    selected = uiState.discountType == DiscountType.PERCENT,
                                    onClick = { viewModel.updateDiscountType(DiscountType.PERCENT) },
                                    label = { Text("Porcentaje") },
                                    modifier = Modifier.weight(1f)
                                )
                                FilterChip(
                                    selected = uiState.discountType == DiscountType.FIXED,
                                    onClick = { viewModel.updateDiscountType(DiscountType.FIXED) },
                                    label = { Text("Monto fijo") },
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Spacer(Modifier.height(8.dp))

                            OutlinedTextField(
                                value = uiState.discount,
                                onValueChange = viewModel::updateDiscount,
                                label = {
                                    Text(
                                        if (uiState.discountType == DiscountType.PERCENT) "Descuento (%)"
                                        else "Descuento ($)"
                                    )
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }

                // Financial summary
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                    shape = MaterialTheme.shapes.large
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "Resumen",
                            style = MaterialTheme.typography.titleMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                        Spacer(Modifier.height(12.dp))

                        SummaryRow("Subtotal Productos", uiState.subtotalProducts.asMXN())

                        if (uiState.extrasTotal > 0) {
                            SummaryRow("Subtotal Extras", uiState.extrasTotal.asMXN())
                        }

                        if (uiState.discountAmount > 0) {
                            SummaryRow(
                                label = if (uiState.discountType == DiscountType.PERCENT) {
                                    "Descuento (${uiState.discount}%)"
                                } else {
                                    "Descuento"
                                },
                                value = "-${uiState.discountAmount.asMXN()}"
                            )
                        }

                        if (uiState.requiresInvoice && uiState.taxAmount > 0) {
                            SummaryRow("IVA (${uiState.taxRate}%)", uiState.taxAmount.asMXN())
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Total",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                text = uiState.total.asMXN(),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = SolennixTheme.colors.primary
                            )
                        }

                        // Profitability section
                        if (uiState.hasCosts) {
                            Spacer(Modifier.height(16.dp))
                            HorizontalDivider()
                            Spacer(Modifier.height(12.dp))

                            Text(
                                text = "Rentabilidad",
                                style = MaterialTheme.typography.titleSmall,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(Modifier.height(8.dp))

                            SummaryRow("Costo productos", uiState.costProducts.asMXN())
                            SummaryRow("Costo extras", uiState.costExtras.asMXN())
                            SummaryRow("Total costos", uiState.totalCosts.asMXN())

                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                            val profitColor = if (uiState.netProfit >= 0) {
                                SolennixTheme.colors.success
                            } else {
                                SolennixTheme.colors.error
                            }

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Ganancia neta",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = profitColor
                                )
                                Text(
                                    text = uiState.netProfit.asMXN(),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = profitColor
                                )
                            }

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Margen %",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = profitColor
                                )
                                Text(
                                    text = "%.1f%%".format(uiState.profitMargin),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = profitColor
                                )
                            }
                        }
                    }
                }

                // Action buttons
                val hasContent = uiState.selectedItems.any { it.productId.isNotEmpty() } ||
                    uiState.extras.any { it.description.isNotBlank() }

                if (isWideScreen) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Generate PDF button
                        Button(
                            onClick = { viewModel.generatePdf(context) },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = SolennixTheme.colors.primary
                            ),
                            enabled = !uiState.isGeneratingPdf
                        ) {
                            if (uiState.isGeneratingPdf) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Icon(Icons.Default.PictureAsPdf, contentDescription = null)
                                Spacer(Modifier.width(8.dp))
                                Text("Generar Cotizacion", style = MaterialTheme.typography.titleMedium)
                            }
                        }

                        // Convert to Event button
                        OutlinedButton(
                            onClick = {
                                val transferData = QuickQuoteTransferData(
                                    products = uiState.selectedItems
                                        .filter { it.productId.isNotEmpty() }
                                        .map { item ->
                                            QuoteTransferProduct(
                                                productId = item.productId,
                                                productName = item.productName,
                                                quantity = item.quantity,
                                                unitPrice = item.unitPrice
                                            )
                                        },
                                    extras = uiState.extras
                                        .filter { it.description.isNotBlank() }
                                        .map { extra ->
                                            QuoteTransferExtra(
                                                description = extra.description,
                                                cost = extra.cost,
                                                price = extra.price,
                                                excludeUtility = extra.excludeUtility
                                            )
                                        },
                                    discountType = when (uiState.discountType) {
                                        DiscountType.PERCENT -> "percent"
                                        DiscountType.FIXED -> "fixed"
                                    },
                                    discountValue = uiState.discount.toDoubleOrNull() ?: 0.0,
                                    requiresInvoice = uiState.requiresInvoice,
                                    numPeople = uiState.numPeople.toIntOrNull() ?: 0
                                )
                                QuickQuoteDataHolder.pendingData = transferData
                                onConvertToEvent()
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            enabled = hasContent
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Convertir a Evento", style = MaterialTheme.typography.titleMedium)
                        }
                    }
                } else {
                    // Generate PDF button
                    Button(
                        onClick = { viewModel.generatePdf(context) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SolennixTheme.colors.primary
                        ),
                        enabled = !uiState.isGeneratingPdf
                    ) {
                        if (uiState.isGeneratingPdf) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Icon(Icons.Default.PictureAsPdf, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Generar Cotizacion", style = MaterialTheme.typography.titleMedium)
                        }
                    }

                    // Convert to Event button
                    OutlinedButton(
                        onClick = {
                            val transferData = QuickQuoteTransferData(
                                products = uiState.selectedItems
                                    .filter { it.productId.isNotEmpty() }
                                    .map { item ->
                                        QuoteTransferProduct(
                                            productId = item.productId,
                                            productName = item.productName,
                                            quantity = item.quantity,
                                            unitPrice = item.unitPrice
                                        )
                                    },
                                extras = uiState.extras
                                    .filter { it.description.isNotBlank() }
                                    .map { extra ->
                                        QuoteTransferExtra(
                                            description = extra.description,
                                            cost = extra.cost,
                                            price = extra.price,
                                            excludeUtility = extra.excludeUtility
                                        )
                                    },
                                discountType = when (uiState.discountType) {
                                    DiscountType.PERCENT -> "percent"
                                    DiscountType.FIXED -> "fixed"
                                },
                                discountValue = uiState.discount.toDoubleOrNull() ?: 0.0,
                                requiresInvoice = uiState.requiresInvoice,
                                numPeople = uiState.numPeople.toIntOrNull() ?: 0
                            )
                            QuickQuoteDataHolder.pendingData = transferData
                            onConvertToEvent()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        enabled = hasContent
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Convertir a Evento", style = MaterialTheme.typography.titleMedium)
                    }
                }

                Spacer(Modifier.height(32.dp))
            }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, onAddClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = SolennixTheme.colors.primaryText
        )
        IconButton(onClick = onAddClick) {
            Icon(
                Icons.Default.AddCircle,
                contentDescription = "Agregar $title",
                tint = SolennixTheme.colors.primary
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProductItemCard(
    item: QuoteItem,
    products: List<Product>,
    onProductSelected: (Product) -> Unit,
    onQuantityChanged: (String) -> Unit,
    onPriceChanged: (String) -> Unit,
    onRemove: () -> Unit,
    canRemove: Boolean
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Product dropdown
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = item.productName.ifEmpty { "Seleccionar producto" },
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.menuAnchor(),
                        textStyle = MaterialTheme.typography.bodyMedium
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        products.forEach { product ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(product.name, style = MaterialTheme.typography.bodyMedium)
                                        Text(
                                            product.basePrice.asMXN(),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                },
                                onClick = {
                                    onProductSelected(product)
                                    expanded = false
                                }
                            )
                        }
                    }
                }

                if (canRemove) {
                    IconButton(onClick = onRemove) {
                        Icon(
                            Icons.Default.RemoveCircle,
                            contentDescription = "Eliminar",
                            tint = SolennixTheme.colors.error
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = item.quantity.toString(),
                    onValueChange = onQuantityChanged,
                    label = { Text("Cant.") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = if (item.unitPrice > 0) item.unitPrice.toString() else "",
                    onValueChange = onPriceChanged,
                    label = { Text("Precio Unit.") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1.5f)
                )
                Column(
                    modifier = Modifier.weight(1f).padding(top = 8.dp),
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = "Subtotal",
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Text(
                        text = item.subtotal.asMXN(),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun ExtraItemCard(
    extra: QuoteExtra,
    onDescriptionChanged: (String) -> Unit,
    onCostChanged: (String) -> Unit,
    onPriceChanged: (String) -> Unit,
    onExcludeUtilityChanged: (Boolean) -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = extra.description,
                    onValueChange = onDescriptionChanged,
                    label = { Text("Descripcion") },
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.RemoveCircle,
                        contentDescription = "Eliminar",
                        tint = SolennixTheme.colors.error
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = if (extra.cost > 0) extra.cost.toString() else "",
                    onValueChange = onCostChanged,
                    label = { Text("Costo") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = if (extra.price > 0) extra.price.toString() else "",
                    onValueChange = onPriceChanged,
                    label = { Text("Precio") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    enabled = !extra.excludeUtility
                )
            }
            Spacer(Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Sin utilidad",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
                Switch(
                    checked = extra.excludeUtility,
                    onCheckedChange = onExcludeUtilityChanged,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = SolennixTheme.colors.primary,
                        checkedTrackColor = SolennixTheme.colors.primaryLight
                    )
                )
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.primaryText
        )
    }
}
