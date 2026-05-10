package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepProducts(viewModel: EventFormViewModel) {
    var showProductPicker by remember { mutableStateOf(false) }
    val isWideScreen = LocalIsWideScreen.current
    val availableProducts by viewModel.availableProducts.collectAsStateWithLifecycle()

    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
                .imePadding()
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showProductPicker = true },
                colors = CardDefaults.cardColors(
                    containerColor = SolennixTheme.colors.primaryLight,
                ),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    SolennixTheme.colors.primary.copy(alpha = 0.3f),
                ),
                shape = MaterialTheme.shapes.medium,
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.AddCircle,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.events_form_products_add),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = SolennixTheme.colors.primary,
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (viewModel.productLoadError != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.error.copy(alpha = 0.08f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.error.copy(alpha = 0.3f)),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            viewModel.productLoadError ?: stringResource(R.string.events_form_products_load_error),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.error
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = { viewModel.retryLoadProducts() }) {
                            Text(stringResource(R.string.events_form_retry))
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (viewModel.selectedProducts.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        Icons.Default.Inventory2,
                        contentDescription = null,
                        tint = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(48.dp),
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        stringResource(R.string.events_form_products_empty_title),
                        style = MaterialTheme.typography.titleMedium,
                        color = SolennixTheme.colors.secondaryText,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.events_form_products_empty_desc),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                    )
                }
            } else {
                Column(modifier = Modifier.fillMaxWidth()) {
                    if (isWideScreen) {
                        val chunkedProducts = viewModel.selectedProducts.chunked(2)
                        chunkedProducts.forEachIndexed { chunkIndex, pair ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Box(modifier = Modifier.weight(1f)) {
                                    ProductSelectionItem(
                                        index = chunkIndex * 2,
                                        item = pair[0],
                                        availableProducts = availableProducts,
                                        onQuantityChange = { viewModel.updateProductQuantity(pair[0].productId, it) },
                                        onDiscountChange = { viewModel.updateProductDiscount(pair[0].productId, it) },
                                        onRemove = { viewModel.removeProduct(pair[0].productId) },
                                    )
                                }
                                if (pair.size > 1) {
                                    Box(modifier = Modifier.weight(1f)) {
                                        ProductSelectionItem(
                                            index = chunkIndex * 2 + 1,
                                            item = pair[1],
                                            availableProducts = availableProducts,
                                            onQuantityChange = { viewModel.updateProductQuantity(pair[1].productId, it) },
                                            onDiscountChange = { viewModel.updateProductDiscount(pair[1].productId, it) },
                                            onRemove = { viewModel.removeProduct(pair[1].productId) },
                                        )
                                    }
                                } else {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    } else {
                        viewModel.selectedProducts.forEachIndexed { index, item ->
                            ProductSelectionItem(
                                index = index,
                                item = item,
                                availableProducts = availableProducts,
                                onQuantityChange = { viewModel.updateProductQuantity(item.productId, it) },
                                onDiscountChange = { viewModel.updateProductDiscount(item.productId, it) },
                                onRemove = { viewModel.removeProduct(item.productId) },
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = SolennixTheme.colors.surfaceAlt,
                        ),
                        shape = MaterialTheme.shapes.medium,
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                stringResource(R.string.events_form_products_subtotal),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = SolennixTheme.colors.secondaryText,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                viewModel.subtotalProducts.asMXN(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = SolennixTheme.colors.primary,
                            )
                        }
                    }
                }
            }
        }
    }

    if (showProductPicker) {
        ProductPickerSheet(
            viewModel = viewModel,
            onDismiss = { showProductPicker = false },
            onProductSelected = { product ->
                viewModel.addProduct(product, 1.0)
                showProductPicker = false
            }
        )
    }
}

@Composable
