package com.creapolis.solennix.feature.dashboard.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.ProductDemandItem
import com.creapolis.solennix.feature.dashboard.R

@Composable
fun ProductDemandWidget(
    products: List<ProductDemandItem>,
    isLoading: Boolean,
    onProductClick: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                stringResource(R.string.dashboard_widget_product_demand_title),
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            when {
                isLoading -> {
                    repeat(3) { index ->
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(16.dp, 10.dp)
                                        .weight(1f)
                                )
                                Box(
                                    modifier = Modifier
                                        .width(60.dp)
                                        .height(10.dp)
                                )
                            }
                            if (index < 2) {
                                HorizontalDivider(color = SolennixTheme.colors.divider.copy(alpha = 0.5f))
                            }
                        }
                    }
                }
                products.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            stringResource(R.string.dashboard_widget_product_demand_empty),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                else -> {
                    Column {
                        products.forEachIndexed { index, product ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onProductClick(product.id) }
                                    .padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        Icons.Default.ShoppingCart,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Column {
                                        Text(
                                            product.name,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.primaryText,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            pluralStringResource(R.plurals.dashboard_widget_product_demand_uses, product.timesUsed, product.timesUsed),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        "${(product.timesUsed * 100 / maxOf(product.timesUsed, 1))}%",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.kpiOrange,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Icon(
                                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.secondaryText,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            if (index < products.lastIndex) {
                                HorizontalDivider(
                                    modifier = Modifier.padding(horizontal = 0.dp),
                                    color = SolennixTheme.colors.divider.copy(alpha = 0.5f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
