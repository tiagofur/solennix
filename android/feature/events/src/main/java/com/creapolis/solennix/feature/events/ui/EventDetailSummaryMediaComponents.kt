package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventPhoto
import com.creapolis.solennix.core.network.UrlResolver

@Composable
fun ContentCardsGrid(
    productsCount: Int,
    extrasCount: Int,
    suppliesCount: Int,
    equipmentCount: Int,
    purchaseSuppliesCount: Int,
    photosCount: Int,
    staffCount: Int,
    onProductsClick: () -> Unit,
    onExtrasClick: () -> Unit,
    onSuppliesClick: () -> Unit,
    onEquipmentClick: () -> Unit,
    onShoppingListClick: () -> Unit,
    onPhotosClick: () -> Unit,
    onStaffClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.ShoppingBag,
                title = "Productos",
                count = productsCount,
                color = SolennixTheme.colors.primary,
                onClick = onProductsClick,
                modifier = Modifier.weight(1f)
            )
            SummaryNavCard(
                icon = Icons.Default.AddCircleOutline,
                title = "Extras",
                count = extrasCount,
                color = SolennixTheme.colors.info,
                onClick = onExtrasClick,
                modifier = Modifier.weight(1f)
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.LocalGroceryStore,
                title = "Insumos",
                count = suppliesCount,
                color = SolennixTheme.colors.warning,
                onClick = onSuppliesClick,
                modifier = Modifier.weight(1f)
            )
            SummaryNavCard(
                icon = Icons.Default.Inventory2,
                title = "Equipo",
                count = equipmentCount,
                color = SolennixTheme.colors.success,
                onClick = onEquipmentClick,
                modifier = Modifier.weight(1f)
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.ShoppingCart,
                title = "Compras",
                subtitle = if (purchaseSuppliesCount > 0) "$purchaseSuppliesCount por comprar" else null,
                color = SolennixTheme.colors.error,
                onClick = onShoppingListClick,
                modifier = Modifier.weight(1f)
            )
            SummaryNavCard(
                icon = Icons.Default.PhotoLibrary,
                title = "Fotos",
                count = photosCount,
                color = SolennixTheme.colors.primary,
                onClick = onPhotosClick,
                modifier = Modifier.weight(1f)
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.Group,
                title = "Personal",
                count = staffCount,
                color = SolennixTheme.colors.info,
                onClick = onStaffClick,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Composable
fun PhotosPreviewCard(
    photos: List<EventPhoto>,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Fotos",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${photos.size}",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primary
                    )
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.tertiaryText
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                photos.take(4).forEachIndexed { index, photo ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1.2f)
                            .clip(RoundedCornerShape(8.dp))
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(UrlResolver.resolve(photo.url))
                                .crossfade(true)
                                .build(),
                            contentDescription = photo.caption,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        if (index == 3 && photos.size > 4) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        color = Color.Black.copy(alpha = 0.5f),
                                        shape = RoundedCornerShape(8.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "+${photos.size - 4}",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
                repeat(maxOf(0, 4 - photos.size)) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun SummaryNavCard(
    icon: ImageVector,
    title: String,
    count: Int? = null,
    subtitle: String? = null,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.weight(1f))
                if (count != null && count > 0) {
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = color.copy(alpha = 0.1f)
                    ) {
                        Text(
                            "$count",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = color
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.secondaryText
                )
            } else {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = stringResource(DesignSystemR.string.cd_visibility),
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
