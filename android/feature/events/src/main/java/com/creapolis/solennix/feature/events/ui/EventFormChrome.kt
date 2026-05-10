package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.events.R

/**
 * Full-screen error state shown when `loadExistingEvent` fails. Replaces the form steps
 * so the user can't interact with an empty/stale form pretending everything is fine.
 */
@Composable
fun EventLoadErrorCard(
    message: String,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Default.CloudOff,
            contentDescription = null,
            modifier = Modifier.size(72.dp),
            tint = SolennixTheme.colors.secondaryText,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.events_form_load_error_title),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(
                containerColor = SolennixTheme.colors.primary,
            ),
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.events_form_retry))
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(onClick = onNavigateBack) {
            Text(stringResource(R.string.events_form_back_action))
        }
    }
}

@Composable
fun BottomStepNavigation(
    currentPage: Int,
    totalPages: Int = 5,
    onNext: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    isEditMode: Boolean = false
) {
    val isLastPage = currentPage == totalPages - 1
    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 8.dp,
        shadowElevation = 16.dp,
    ) {
        // Botones a tamaño M3 default (40dp). Antes estaban apretados con
        // weight(1f) y forzados a ocupar toda la franja; se veían enormes.
        Row(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (currentPage > 0) {
                TextButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(stringResource(R.string.events_form_previous))
                }
            } else {
                Spacer(modifier = Modifier.width(1.dp))
            }

            Button(
                onClick = onNext,
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = SolennixTheme.colors.primary,
                ),
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = if (isLastPage) (if (isEditMode) stringResource(R.string.events_form_save_changes) else stringResource(R.string.events_form_finish)) else stringResource(R.string.events_form_next),
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(modifier = Modifier.width(6.dp))
                Icon(
                    imageVector = if (isLastPage) Icons.Default.Check else Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

/**
 * Step indicator con iconos (no números) — mirror del patrón de Web.
 * Los pasos anteriores son tappables para volver; los futuros están bloqueados
 * hasta que se valide cada paso via onNext.
 */
@Composable
fun EventFormStepIndicator(
    currentPage: Int,
    onStepClick: (Int) -> Unit,
) {
    data class StepMeta(val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String)
    val steps = listOf(
        StepMeta(Icons.Default.Info, stringResource(R.string.events_form_step_general)),
        StepMeta(Icons.Default.Inventory2, stringResource(R.string.events_form_step_products)),
        StepMeta(Icons.Default.AutoAwesome, stringResource(R.string.events_form_step_extras)),
        StepMeta(Icons.Default.ShoppingCart, stringResource(R.string.events_form_step_inventory)),
        StepMeta(Icons.Default.Payments, stringResource(R.string.events_form_step_finances)),
    )
    val progress = (currentPage + 1).toFloat() / steps.size.toFloat()

    Column(modifier = Modifier.fillMaxWidth()) {
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth(),
            color = SolennixTheme.colors.primary,
            trackColor = SolennixTheme.colors.borderLight,
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            steps.forEachIndexed { index, step ->
                val isCompleted = index < currentPage
                val isActive = index == currentPage
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable(enabled = index < currentPage) { onStepClick(index) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    isCompleted -> SolennixTheme.colors.primary
                                    isActive -> SolennixTheme.colors.primaryLight
                                    else -> SolennixTheme.colors.surfaceAlt
                                }
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = if (isCompleted) Icons.Default.Check else step.icon,
                            contentDescription = null,
                            tint = when {
                                isCompleted -> Color.White
                                isActive -> SolennixTheme.colors.primary
                                else -> SolennixTheme.colors.secondaryText
                            },
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    if (isActive) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = step.label,
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.primary,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }
}
