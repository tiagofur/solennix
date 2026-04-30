package com.creapolis.solennix.feature.auth.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.creapolis.solennix.feature.auth.R
import com.creapolis.solennix.core.designsystem.theme.SolennixGold
import com.creapolis.solennix.core.designsystem.theme.SolennixGoldDark
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.SolennixTitle

/**
 * Branding panel shown on the left side of auth screens on tablet layout.
 * Mirrors the web app's premium gradient left panel on login/register pages.
 */
@Composable
fun AuthBrandingPanel(modifier: Modifier = Modifier) {
    val premiumGradient = Brush.linearGradient(
        colors = listOf(SolennixGold, SolennixGoldDark)
    )

    Box(
        modifier = modifier
            .fillMaxHeight()
            .background(premiumGradient)
            .padding(40.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Logo at top
            Text(
                text = "SOLENNIX",
                style = SolennixTitle,
                color = Color.White,
                fontSize = 28.sp
            )

            // Main copy in center
            Column {
                Text(
                    text = stringResource(R.string.auth_branding_headline),
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Black,
                        lineHeight = 40.sp
                    ),
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = stringResource(R.string.auth_branding_description),
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White.copy(alpha = 0.85f)
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Feature highlights
                FeatureHighlight(
                    icon = Icons.Default.Event,
                    text = stringResource(R.string.auth_branding_feature_events)
                )
                Spacer(modifier = Modifier.height(12.dp))
                FeatureHighlight(
                    icon = Icons.Default.Description,
                    text = stringResource(R.string.auth_branding_feature_quotes)
                )
                Spacer(modifier = Modifier.height(12.dp))
                FeatureHighlight(
                    icon = Icons.Default.Inventory,
                    text = stringResource(R.string.auth_branding_feature_inventory)
                )
            }

            // Social proof at bottom
            Column {
                HorizontalDivider(
                    color = Color.White.copy(alpha = 0.3f),
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                Text(
                    text = stringResource(R.string.auth_branding_social_proof),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.7f),
                    textAlign = TextAlign.Start
                )
            }
        }
    }
}

@Composable
private fun FeatureHighlight(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Color.White.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
            color = Color.White.copy(alpha = 0.9f)
        )
    }
}

/**
 * Wrapper that applies split layout on tablets (branding left + content right)
 * or single-column layout on phones.
 */
@Composable
fun AdaptiveAuthLayout(
    isWideScreen: Boolean,
    content: @Composable () -> Unit
) {
    if (isWideScreen) {
        Row(modifier = Modifier.fillMaxSize()) {
            AuthBrandingPanel(
                modifier = Modifier.fillMaxWidth(0.4f)
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
                    .background(SolennixTheme.colors.background),
                contentAlignment = Alignment.Center
            ) {
                Box(modifier = Modifier.widthIn(max = 480.dp)) {
                    content()
                }
            }
        }
    } else {
        content()
    }
}
