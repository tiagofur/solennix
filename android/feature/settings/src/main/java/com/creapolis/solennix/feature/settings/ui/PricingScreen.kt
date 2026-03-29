package com.creapolis.solennix.feature.settings.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PricingScreen(
    viewModel: SettingsViewModel,
    onNavigateBack: () -> Unit
) {
    val user by viewModel.currentUser.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current
    val scrollState = rememberScrollState()
    val isPremium = user?.plan?.name == "PREMIUM"

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Plan y Precios") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 900.dp) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            // Current Plan
            if (isPremium) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    color = SolennixTheme.colors.primary.copy(alpha = 0.1f)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = SolennixTheme.colors.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Plan Premium Activo",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = SolennixTheme.colors.primary
                            )
                            Text(
                                text = "Tienes acceso a todas las funciones",
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }

            // Plan Cards
            if (isWideScreen) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        PlanCard(
                            title = "Básico",
                            price = "Gratis",
                            features = listOf(
                                "20 productos",
                                "50 clientes",
                                "Generación de contratos",
                                "Calendario de eventos"
                            ),
                            isCurrentPlan = !isPremium,
                            isPremium = false
                        )
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        PlanCard(
                            title = "Premium",
                            price = "$199 MXN/mes",
                            features = listOf(
                                "Productos ilimitados",
                                "Clientes ilimitados",
                                "Widgets para pantalla de inicio",
                                "Comandos de voz con Siri",
                                "Soporte prioritario",
                                "Sin marca de agua en PDFs"
                            ),
                            isCurrentPlan = isPremium,
                            isPremium = true
                        )
                    }
                }
            } else {
                // Basic Plan Card
                PlanCard(
                    title = "Básico",
                    price = "Gratis",
                    features = listOf(
                        "20 productos",
                        "50 clientes",
                        "Generación de contratos",
                        "Calendario de eventos"
                    ),
                    isCurrentPlan = !isPremium,
                    isPremium = false
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Premium Plan Card
                PlanCard(
                    title = "Premium",
                    price = "$199 MXN/mes",
                    features = listOf(
                        "Productos ilimitados",
                        "Clientes ilimitados",
                        "Widgets para pantalla de inicio",
                        "Comandos de voz con Siri",
                        "Soporte prioritario",
                        "Sin marca de agua en PDFs"
                    ),
                    isCurrentPlan = isPremium,
                    isPremium = true
                )
            }

            if (!isPremium) {
                Spacer(modifier = Modifier.height(24.dp))
                PremiumButton(
                    text = "Actualizar a Premium",
                    onClick = { /* TODO: Implement Play Billing */ }
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // FAQ Section
            Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "Preguntas Frecuentes",
                style = MaterialTheme.typography.labelLarge,
                color = SolennixTheme.colors.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            FAQItem(
                question = "¿Puedo cancelar en cualquier momento?",
                answer = "Sí, puedes cancelar tu suscripción en cualquier momento desde la configuración de Google Play Store."
            )

            FAQItem(
                question = "¿Se pierden mis datos si cancelo?",
                answer = "No, tus datos se conservan. Solo se limitan las funciones premium."
            )

            FAQItem(
                question = "¿Hay descuento por pago anual?",
                answer = "Sí, el plan anual tiene un descuento del 20% comparado con el pago mensual."
            )
            } // end FAQ Column

            Spacer(modifier = Modifier.height(32.dp))
        }
        }
    }
}

@Composable
private fun PlanCard(
    title: String,
    price: String,
    features: List<String>,
    isCurrentPlan: Boolean,
    isPremium: Boolean
) {
    val borderColor = if (isPremium) SolennixTheme.colors.primary else SolennixTheme.colors.divider
    val backgroundColor = if (isCurrentPlan) {
        if (isPremium) SolennixTheme.colors.primary.copy(alpha = 0.05f)
        else SolennixTheme.colors.card
    } else {
        SolennixTheme.colors.card
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = backgroundColor,
        border = BorderStroke(
            width = if (isCurrentPlan) 2.dp else 1.dp,
            color = if (isCurrentPlan) borderColor else SolennixTheme.colors.divider
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (isPremium) SolennixTheme.colors.primary else SolennixTheme.colors.primaryText
                )
                if (isCurrentPlan) {
                    Surface(
                        shape = MaterialTheme.shapes.medium,
                        color = SolennixTheme.colors.primary.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = "Actual",
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.primary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = price,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText
            )

            Spacer(modifier = Modifier.height(16.dp))

            features.forEach { feature ->
                Row(
                    modifier = Modifier.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = SolennixTheme.colors.success
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = feature,
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun FAQItem(question: String, answer: String) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        shape = MaterialTheme.shapes.medium,
        color = SolennixTheme.colors.card,
        tonalElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = question,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = SolennixTheme.colors.primaryText
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = answer,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )
        }
    }
}
