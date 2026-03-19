package com.creapolis.solennix.feature.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixGradient
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.Spacing

/**
 * Reusable page content composable for the onboarding HorizontalPager.
 *
 * Displays an icon inside a gradient circle, a title, an optional description,
 * and an optional list of feature bullet items with checkmark icons.
 */
@Composable
fun OnboardingPageContent(
    icon: ImageVector,
    title: String,
    description: String? = null,
    features: List<String>? = null,
    modifier: Modifier = Modifier,
    extraContent: @Composable ColumnScope.() -> Unit = {}
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Icon with gradient background circle
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(SolennixGradient.premiumBrush),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(56.dp),
                tint = androidx.compose.ui.graphics.Color.White
            )
        }

        Spacer(modifier = Modifier.height(Spacing.xxl))

        // Title
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = SolennixTheme.colors.primaryText,
            textAlign = TextAlign.Center
        )

        // Description
        if (description != null) {
            Spacer(modifier = Modifier.height(Spacing.md))
            Text(
                text = description,
                style = MaterialTheme.typography.bodyLarge,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )
        }

        // Feature list
        if (!features.isNullOrEmpty()) {
            Spacer(modifier = Modifier.height(Spacing.xl))
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                features.forEach { feature ->
                    OnboardingFeatureItem(text = feature)
                }
            }
        }

        // Extra composable content slot (e.g. for the CTA button on the last page)
        extraContent()
    }
}

@Composable
private fun OnboardingFeatureItem(
    text: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(SolennixTheme.colors.primary.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = SolennixTheme.colors.primary
            )
        }
        Spacer(modifier = Modifier.width(Spacing.md))
        Text(
            text = text,
            style = MaterialTheme.typography.bodyLarge,
            color = SolennixTheme.colors.primaryText
        )
    }
}
