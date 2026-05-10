package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RestaurantMenu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit,
    onProductSelected: (Product) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var searchQuery by remember { mutableStateOf("") }
    val products = viewModel.availableProducts.collectAsStateWithLifecycle()
    val filteredProducts = remember(searchQuery, products.value) {
        if (searchQuery.isBlank()) products.value
        else products.value.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
                it.category.contains(searchQuery, ignoreCase = true)
        }
    }
    val selectedIds = remember(viewModel.selectedProducts.size) {
        viewModel.selectedProducts.map { it.productId }.toSet()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
            Text(
                stringResource(R.string.events_form_products_picker_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = stringResource(R.string.events_form_products_search),
                leadingIcon = Icons.Default.Search,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            if (viewModel.isLoadingProducts && products.value.isEmpty()) {
                Text(
                    stringResource(R.string.events_form_products_loading),
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText
                )
            } else if (filteredProducts.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.RestaurantMenu,
                    title = stringResource(R.string.events_form_products_no_results),
                    message = stringResource(R.string.events_form_products_no_results_message),
                    actionText = stringResource(R.string.events_form_retry),
                    onAction = { viewModel.retryLoadProducts() }
                )
            } else {
                LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                    items(filteredProducts.size) { index ->
                        val product = filteredProducts[index]
                        val isSelected = selectedIds.contains(product.id)
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp)
                                .clickable { onProductSelected(product) },
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) SolennixTheme.colors.primary.copy(alpha = 0.08f)
                                else SolennixTheme.colors.card
                            ),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(product.name, style = MaterialTheme.typography.bodyLarge)
                                    Text(
                                        product.category,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    product.basePrice.asMXN(),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primary,
                                    fontWeight = FontWeight.SemiBold
                                )
                                if (isSelected) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = stringResource(R.string.events_form_products_selected_a11y),
                                        tint = SolennixTheme.colors.success,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}