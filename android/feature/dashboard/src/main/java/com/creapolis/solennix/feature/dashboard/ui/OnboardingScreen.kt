package com.creapolis.solennix.feature.dashboard.ui

import android.content.Context
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.Spacing
import kotlinx.coroutines.launch

private const val ONBOARDING_PREFS = "solennix_onboarding"
private const val KEY_HAS_SEEN_ONBOARDING = "has_seen_onboarding"
private const val PAGE_COUNT = 4

/**
 * Full-screen first-launch onboarding experience with a 4-page HorizontalPager.
 *
 * Pages:
 * 1. Welcome
 * 2. Core features
 * 3. Android-specific features
 * 4. Get started CTA
 *
 * @param onComplete Called after the user finishes or skips onboarding.
 *                   The SharedPreferences flag is set before invoking this callback.
 */
@Composable
fun OnboardingScreen(
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    val pagerState = rememberPagerState(pageCount = { PAGE_COUNT })
    val coroutineScope = rememberCoroutineScope()

    val completeOnboarding = {
        context.getSharedPreferences(ONBOARDING_PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_HAS_SEEN_ONBOARDING, true)
            .apply()
        onComplete()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SolennixTheme.colors.background)
    ) {
        // Pager
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 140.dp) // Room for navigation controls
        ) { page ->
            when (page) {
                0 -> OnboardingPageContent(
                    icon = Icons.Default.AutoAwesome,
                    title = "Bienvenido a Solennix",
                    description = "La herramienta definitiva para organizar tus eventos de manera profesional"
                )
                1 -> OnboardingPageContent(
                    icon = Icons.Default.Layers,
                    title = "Todo en un Solo Lugar",
                    features = listOf(
                        "Gestiona clientes y contactos",
                        "Crea cotizaciones y contratos",
                        "Controla tu inventario",
                        "Programa eventos en calendario"
                    )
                )
                2 -> OnboardingPageContent(
                    icon = Icons.Default.PhoneAndroid,
                    title = "Diseñado para Android",
                    features = listOf(
                        "Widgets en tu pantalla de inicio",
                        "Modo oscuro automatico",
                        "Funciona sin conexion",
                        "Notificaciones inteligentes",
                        "Soporte para tablets y plegables"
                    )
                )
                3 -> OnboardingPageContent(
                    icon = Icons.Default.RocketLaunch,
                    title = "Comienza Ahora",
                    description = "Crea tu cuenta o inicia sesion para empezar"
                ) {
                    Spacer(modifier = Modifier.height(Spacing.xxl))
                    PremiumButton(
                        text = "Comenzar",
                        onClick = { completeOnboarding() },
                        modifier = Modifier.padding(horizontal = Spacing.md)
                    )
                }
            }
        }

        // Skip button (top-right) - hidden on last page
        if (pagerState.currentPage < PAGE_COUNT - 1) {
            TextButton(
                onClick = { completeOnboarding() },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .statusBarsPadding()
                    .padding(end = Spacing.sm, top = Spacing.sm)
            ) {
                Text(
                    text = "Omitir",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Medium,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }

        // Bottom navigation: page indicators + "Siguiente" button
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = Spacing.xxl, start = Spacing.xl, end = Spacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Page indicators (dots)
            Row(
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(PAGE_COUNT) { index ->
                    val isActive = pagerState.currentPage == index
                    val color by animateColorAsState(
                        targetValue = if (isActive)
                            SolennixTheme.colors.primary
                        else
                            SolennixTheme.colors.divider,
                        label = "dotColor_$index"
                    )
                    Box(
                        modifier = Modifier
                            .size(if (isActive) 10.dp else 8.dp)
                            .clip(CircleShape)
                            .background(color)
                    )
                }
            }

            Spacer(modifier = Modifier.height(Spacing.xl))

            // "Siguiente" button (hidden on last page where PremiumButton is shown inline)
            if (pagerState.currentPage < PAGE_COUNT - 1) {
                PremiumButton(
                    text = "Siguiente",
                    onClick = {
                        coroutineScope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    }
                )
            }
        }
    }
}

/**
 * Checks whether the user has already completed the first-launch onboarding.
 */
fun hasSeenOnboarding(context: Context): Boolean {
    return context.getSharedPreferences(ONBOARDING_PREFS, Context.MODE_PRIVATE)
        .getBoolean(KEY_HAS_SEEN_ONBOARDING, false)
}
