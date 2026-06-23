package com.creapolis.solennix.feature.products.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.products.ProductStrings
import com.creapolis.solennix.feature.products.viewmodel.ProductSortKey

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductRowActionsBottomSheet(
    product: Product,
    onDetails: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 32.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(
                    product.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    listOfNotNull(
                        product.category.takeIf { it.isNotBlank() },
                        product.basePrice.asMXN()
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    maxLines = 1
                )
            }
            HorizontalDivider(color = SolennixTheme.colors.divider)

            RowActionItem(
                icon = Icons.Default.Info,
                label = ProductStrings.menuDetails,
                onClick = onDetails
            )
            RowActionItem(
                icon = Icons.Default.Edit,
                label = ProductStrings.menuEdit,
                onClick = onEdit
            )
            RowActionItem(
                icon = Icons.Default.Delete,
                label = ProductStrings.menuDelete,
                destructive = true,
                onClick = onDelete
            )
        }
    }
}

@Composable
private fun RowActionItem(
    icon: ImageVector,
    label: String,
    destructive: Boolean = false,
    onClick: () -> Unit
) {
    val tint = if (destructive) SolennixTheme.colors.error else SolennixTheme.colors.primaryText
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = tint)
        Spacer(modifier = Modifier.width(16.dp))
        Text(label, style = MaterialTheme.typography.bodyLarge, color = tint)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFilterBottomSheet(
    sortKey: ProductSortKey,
    sortAscending: Boolean,
    showInactive: Boolean,
    onSortKeyChange: (ProductSortKey) -> Unit,
    onSortAscendingChange: (Boolean) -> Unit,
    onShowInactiveChange: (Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 40.dp)
        ) {
            Text(
                text = ProductStrings.filterTitle,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primaryText,
                modifier = Modifier.padding(bottom = 20.dp)
            )

            Text(
                text = ProductStrings.sortBy,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ProductSortKey.entries.forEach { key ->
                    val label = when (key) {
                        ProductSortKey.NAME -> ProductStrings.sortName
                        ProductSortKey.PRICE -> ProductStrings.sortPrice
                        ProductSortKey.CATEGORY -> ProductStrings.sortCategory
                    }
                    val isSelected = sortKey == key
                    FilterChip(
                        selected = isSelected,
                        onClick = { onSortKeyChange(key) },
                        label = { Text(label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SolennixTheme.colors.primaryLight,
                            selectedLabelColor = SolennixTheme.colors.primary
                        )
                    )
                }
            }

            Text(
                text = ProductStrings.order,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = sortAscending,
                    onClick = { onSortAscendingChange(true) },
                    label = { Text(ProductStrings.orderAsc) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.ArrowUpward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = SolennixTheme.colors.primaryLight,
                        selectedLabelColor = SolennixTheme.colors.primary
                    )
                )

                FilterChip(
                    selected = !sortAscending,
                    onClick = { onSortAscendingChange(false) },
                    label = { Text(ProductStrings.orderDesc) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.ArrowDownward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = SolennixTheme.colors.primaryLight,
                        selectedLabelColor = SolennixTheme.colors.primary
                    )
                )
            }

            HorizontalDivider(
                color = SolennixTheme.colors.divider.copy(alpha = 0.5f),
                modifier = Modifier.padding(bottom = 20.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = ProductStrings.showInactiveLabel,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = SolennixTheme.colors.primaryText
                )
                Switch(
                    checked = showInactive,
                    onCheckedChange = onShowInactiveChange,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = SolennixTheme.colors.primary,
                        checkedTrackColor = SolennixTheme.colors.primaryLight
                    )
                )
            }
        }
    }
}
