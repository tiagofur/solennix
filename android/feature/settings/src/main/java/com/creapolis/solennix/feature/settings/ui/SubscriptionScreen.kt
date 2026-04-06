package com.creapolis.solennix.feature.settings.ui

import android.app.Activity
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.revenuecat.purchases.Package
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.billing.BillingState
import com.creapolis.solennix.feature.settings.viewmodel.SubscriptionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(
    viewModel: SubscriptionViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val activity = context as? Activity

    LaunchedEffect(Unit) {
        viewModel.initBilling()
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Planes y Suscripcion") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atras")
                    }
                },
                actions = {
                    TextButton(onClick = { viewModel.restorePurchases() }) {
                        Text(
                            "Restaurar",
                            color = SolennixTheme.colors.primary,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 700.dp) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Current Plan Header
            item(key = "current_plan") {
                CurrentPlanCard(
                    planName = uiState.currentPlanName,
                    isActive = uiState.hasActiveSubscription
                )
            }

            // Billing State
            item {
                when (val state = uiState.billingState) {
                    is BillingState.NotReady -> {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = SolennixTheme.colors.primary
                        )
                    }
                    is BillingState.Error -> {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = SolennixTheme.colors.error.copy(alpha = 0.1f)
                            ),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Error,
                                    contentDescription = null,
                                    tint = SolennixTheme.colors.error
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = state.message,
                                    color = SolennixTheme.colors.error
                                )
                            }
                        }
                    }
                    is BillingState.Ready -> {
                        // Plans are ready
                    }
                }
            }

            // Plan Cards
            item {
                Text(
                    text = "Elige tu plan",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primaryText
                )
            }

            // Basic Plan (Free)
            item {
                PlanCard(
                    planName = "Basico",
                    price = "Gratis",
                    period = "",
                    features = listOf(
                        PlanFeature("3 eventos por mes", true),
                        PlanFeature("50 clientes", true),
                        PlanFeature("20 productos", true),
                        PlanFeature("Reportes basicos", true),
                        PlanFeature("Marca personalizada", false),
                        PlanFeature("Soporte prioritario", false)
                    ),
                    isCurrentPlan = !uiState.hasActiveSubscription,
                    isRecommended = false,
                    onClick = { /* Free plan, no action */ }
                )
            }

            // Pro Packages
            items(uiState.proPackages, key = { "pro_${it.identifier}" }) { rcPackage ->
                val price = rcPackage.product.price.formatted
                val isYearly = rcPackage.identifier.contains("annual", ignoreCase = true) ||
                        rcPackage.identifier.contains("yearly", ignoreCase = true)
                PlanCard(
                    planName = "Pro",
                    price = price,
                    period = if (isYearly) "/ano" else "/mes",
                    features = listOf(
                        PlanFeature("20 eventos por mes", true),
                        PlanFeature("500 clientes", true),
                        PlanFeature("100 productos", true),
                        PlanFeature("Reportes avanzados", true),
                        PlanFeature("Marca personalizada", true),
                        PlanFeature("Soporte prioritario", false)
                    ),
                    isCurrentPlan = uiState.currentPlanName == "Pro",
                    isRecommended = isYearly,
                    savingsText = if (isYearly) "Ahorra 20%" else null,
                    onClick = {
                        activity?.let { viewModel.launchPurchase(it, rcPackage) }
                    }
                )
            }

            // Premium Packages
            items(uiState.premiumPackages, key = { "premium_${it.identifier}" }) { rcPackage ->
                val price = rcPackage.product.price.formatted
                val isYearly = rcPackage.identifier.contains("annual", ignoreCase = true) ||
                        rcPackage.identifier.contains("yearly", ignoreCase = true)
                PlanCard(
                    planName = "Premium",
                    price = price,
                    period = if (isYearly) "/ano" else "/mes",
                    features = listOf(
                        PlanFeature("Eventos ilimitados", true),
                        PlanFeature("Clientes ilimitados", true),
                        PlanFeature("Productos ilimitados", true),
                        PlanFeature("Reportes avanzados", true),
                        PlanFeature("Marca personalizada", true),
                        PlanFeature("Soporte prioritario", true)
                    ),
                    isCurrentPlan = uiState.currentPlanName == "Premium",
                    isRecommended = false,
                    savingsText = if (isYearly) "Ahorra 20%" else null,
                    onClick = {
                        activity?.let { viewModel.launchPurchase(it, rcPackage) }
                    }
                )
            }

            // FAQ Section
            item {
                Column {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Preguntas frecuentes",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primaryText
                    )
                }
            }

            item {
                FaqItem(
                    question = "Puedo cancelar en cualquier momento?",
                    answer = "Si, puedes cancelar tu suscripcion cuando quieras desde la configuracion de tu cuenta de Google Play."
                )
            }

            item {
                FaqItem(
                    question = "Que pasa con mis datos si cancelo?",
                    answer = "Tus datos se mantienen, pero tendras acceso limitado segun el plan basico."
                )
            }

            item {
                FaqItem(
                    question = "Puedo cambiar de plan?",
                    answer = "Si, puedes actualizar o degradar tu plan en cualquier momento."
                )
            }

            item {
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
        }
    }
}

@Composable
fun CurrentPlanCard(
    planName: String,
    isActive: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = SolennixTheme.colors.primaryLight
        ),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Plan actual",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.primary
                )
                Text(
                    text = planName,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primaryText
                )
            }
            if (isActive) {
                Surface(
                    color = SolennixTheme.colors.success.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "Activo",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        color = SolennixTheme.colors.success,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

data class PlanFeature(
    val text: String,
    val included: Boolean
)

@Composable
fun PlanCard(
    planName: String,
    price: String,
    period: String,
    features: List<PlanFeature>,
    isCurrentPlan: Boolean,
    isRecommended: Boolean,
    savingsText: String? = null,
    onClick: () -> Unit
) {
    val borderColor = when {
        isCurrentPlan -> SolennixTheme.colors.success
        isRecommended -> SolennixTheme.colors.primary
        else -> Color.Transparent
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (borderColor != Color.Transparent)
                    Modifier.border(2.dp, borderColor, MaterialTheme.shapes.medium)
                else Modifier
            )
            .clickable(enabled = !isCurrentPlan, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Text(
                        text = planName,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primaryText
                    )
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = price,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = SolennixTheme.colors.primary
                        )
                        if (period.isNotEmpty()) {
                            Text(
                                text = period,
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    if (isRecommended) {
                        Surface(
                            color = SolennixTheme.colors.primary,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "Recomendado",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    savingsText?.let {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = it,
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.success,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(16.dp))

            features.forEach { feature ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (feature.included) Icons.Default.Check else Icons.Default.Close,
                        contentDescription = null,
                        tint = if (feature.included)
                            SolennixTheme.colors.success
                        else
                            SolennixTheme.colors.secondaryText.copy(alpha = 0.5f),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = feature.text,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (feature.included)
                            SolennixTheme.colors.primaryText
                        else
                            SolennixTheme.colors.secondaryText.copy(alpha = 0.5f)
                    )
                }
            }

            if (!isCurrentPlan) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SolennixTheme.colors.primary
                    )
                ) {
                    Text("Seleccionar plan")
                }
            } else {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(
                    onClick = { },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = false
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Plan actual")
                }
            }
        }
    }
}

@Composable
fun FaqItem(
    question: String,
    answer: String
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded },
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
                    text = question,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = SolennixTheme.colors.primaryText,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText
                )
            }
            if (expanded) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = answer,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
    }
}
