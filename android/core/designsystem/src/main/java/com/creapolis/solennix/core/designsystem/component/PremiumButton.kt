package com.creapolis.solennix.core.designsystem.component

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixGradient
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

enum class ButtonStyle {
    Primary,
    Secondary,
    Destructive
}

@Composable
fun PremiumButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    style: ButtonStyle = ButtonStyle.Primary,
    isLoading: Boolean = false,
    enabled: Boolean = true
) {
    val isLargeFontScale = LocalDensity.current.fontScale >= 1.3f
    // heightIn MUST bound both min AND max. Without `max`, the inner
    // Box(Modifier.fillMaxSize()) in the Primary style demands maximum height from its
    // parent constraints and, when placed in an unbounded context (e.g. a Scaffold
    // bottomBar), the Button grows to fill the entire screen. See /Users/tiagofur/.claude/plans/proud-juggling-wolf.md
    // for the full incident analysis.
    val buttonModifier = modifier
        .fillMaxWidth()
        .heightIn(
            min = if (isLargeFontScale) 56.dp else 50.dp,
            max = if (isLargeFontScale) 88.dp else 64.dp,
        )
        .animateContentSize()

    when (style) {
        ButtonStyle.Primary -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled && !isLoading,
                shape = MaterialTheme.shapes.small,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.Transparent,
                    disabledContainerColor = SolennixTheme.colors.border
                ),
                contentPadding = PaddingValues()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .then(
                            if (enabled && !isLoading) Modifier.background(SolennixGradient.premiumBrush)
                            else Modifier
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    ButtonContent(text, icon, isLoading, Color.White, isLargeFontScale)
                }
            }
        }
        ButtonStyle.Secondary -> {
            OutlinedButton(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled && !isLoading,
                shape = MaterialTheme.shapes.small,
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = SolennixTheme.colors.primary
                ),
                border = BorderStroke(
                    width = 1.dp,
                    brush = if (enabled) SolennixGradient.premiumBrush else SolidColor(SolennixTheme.colors.border)
                )
            ) {
                ButtonContent(text, icon, isLoading, SolennixTheme.colors.primary, isLargeFontScale)
            }
        }
        ButtonStyle.Destructive -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled && !isLoading,
                shape = MaterialTheme.shapes.small,
                colors = ButtonDefaults.buttonColors(
                    containerColor = SolennixTheme.colors.error,
                    contentColor = Color.White
                )
            ) {
                ButtonContent(text, icon, isLoading, Color.White, isLargeFontScale)
            }
        }
    }
}

@Composable
private fun ButtonContent(
    text: String,
    icon: ImageVector?,
    isLoading: Boolean,
    contentColor: Color,
    isLargeFontScale: Boolean
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = contentColor,
                strokeWidth = 2.dp
            )
        } else {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = text,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                maxLines = if (isLargeFontScale) 2 else 1,
                overflow = if (isLargeFontScale) TextOverflow.Clip else TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )
        }
    }
}
