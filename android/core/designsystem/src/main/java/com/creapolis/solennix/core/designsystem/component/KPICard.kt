package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.creapolis.solennix.core.designsystem.theme.SolennixElevation
import com.creapolis.solennix.core.designsystem.theme.Spacing
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription

@Composable
fun KPICard(
    title: String,
    value: String,
    icon: ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier,
    subtitle: String? = null
) {
    val isLargeFontScale = LocalDensity.current.fontScale >= 1.3f
    Card(
        modifier = modifier
            .defaultMinSize(minWidth = if (isLargeFontScale) Spacing.xxxl else 155.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = "$title: $value" + (subtitle?.let { ". $it" } ?: "")
            },
        colors = CardDefaults.cardColors(
            containerColor = SolennixTheme.colors.card
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = SolennixElevation.sm
        ),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = Spacing.xl, horizontal = Spacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                color = iconColor.copy(alpha = 0.1f),
                shape = CircleShape,
                modifier = Modifier.size(Spacing.xxl)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(Spacing.xl)
                    )
                }
            }

            Spacer(modifier = Modifier.height(Spacing.sm))

            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.5).sp
                ),
                color = SolennixTheme.colors.primaryText,
                maxLines = if (isLargeFontScale) 2 else 1,
                overflow = if (isLargeFontScale) TextOverflow.Clip else TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText,
                maxLines = if (isLargeFontScale) 2 else 1,
                overflow = if (isLargeFontScale) TextOverflow.Clip else TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.semantics { heading() }
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.tertiaryText,
                    maxLines = if (isLargeFontScale) 2 else 1,
                    overflow = if (isLargeFontScale) TextOverflow.Clip else TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
