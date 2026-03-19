package com.creapolis.solennix.core.designsystem.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * Styles for the upgrade banner.
 */
enum class UpgradeBannerStyle {
    WARNING,  // Yellow - approaching limit
    LIMIT,    // Red - limit reached
    PROMO     // Primary - promotional upgrade
}

/**
 * A banner that encourages users to upgrade their plan.
 */
@Composable
fun UpgradeBanner(
    message: String,
    style: UpgradeBannerStyle = UpgradeBannerStyle.PROMO,
    onUpgradeClick: () -> Unit,
    onDismiss: (() -> Unit)? = null,
    visible: Boolean = true,
    modifier: Modifier = Modifier
) {
    val (backgroundColor, iconColor, icon) = when (style) {
        UpgradeBannerStyle.WARNING -> Triple(
            SolennixTheme.colors.warning.copy(alpha = 0.15f),
            SolennixTheme.colors.warning,
            Icons.Default.Warning
        )
        UpgradeBannerStyle.LIMIT -> Triple(
            SolennixTheme.colors.error.copy(alpha = 0.15f),
            SolennixTheme.colors.error,
            Icons.Default.Block
        )
        UpgradeBannerStyle.PROMO -> Triple(
            SolennixTheme.colors.primaryLight,
            SolennixTheme.colors.primary,
            Icons.Default.Upgrade
        )
    }

    AnimatedVisibility(
        visible = visible,
        enter = expandVertically(),
        exit = shrinkVertically()
    ) {
        Card(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            colors = CardDefaults.cardColors(containerColor = backgroundColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = onUpgradeClick,
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = iconColor
                        )
                    ) {
                        Text("Ver planes", fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                onDismiss?.let {
                    IconButton(onClick = it) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Cerrar",
                            tint = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            }
        }
    }
}

/**
 * A premium badge that indicates a feature requires an upgrade.
 */
@Composable
fun PremiumFeatureBadge(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(4.dp),
        color = SolennixTheme.colors.primary.copy(alpha = 0.1f),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Star,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = SolennixTheme.colors.primary
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "PRO",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primary
            )
        }
    }
}

/**
 * A card showing usage progress towards limits.
 */
@Composable
fun UsageLimitCard(
    title: String,
    current: Int,
    limit: Int,
    icon: ImageVector,
    onUpgradeClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val progress = if (limit > 0) current.toFloat() / limit.toFloat() else 0f
    val progressColor = when {
        progress >= 1f -> SolennixTheme.colors.error
        progress >= 0.8f -> SolennixTheme.colors.warning
        else -> SolennixTheme.colors.primary
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "$current / $limit",
                    style = MaterialTheme.typography.labelMedium,
                    color = progressColor,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            LinearProgressIndicator(
                progress = { progress.coerceAtMost(1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp),
                color = progressColor,
                trackColor = SolennixTheme.colors.divider
            )

            if (progress >= 0.8f) {
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = onUpgradeClick,
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = SolennixTheme.colors.primary
                    ),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text("Ampliar límite", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}
