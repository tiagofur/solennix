package com.creapolis.solennix.feature.settings.ui

import android.app.Activity
import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.event.UiEventSnackbarHandler
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.SubscriptionProvider
import com.creapolis.solennix.feature.settings.billing.BillingState
import com.creapolis.solennix.feature.settings.viewmodel.SubscriptionViewModel

private val PRO_FEATURES = listOf(
    PlanFeature("Eventos ilimitados", true),
    PlanFeature("Clientes ilimitados", true),
    PlanFeature("Productos ilimitados", true),
    PlanFeature("Reportes avanzados", true),
    PlanFeature("Widgets de inicio", true),
    PlanFeature("Marca personalizada", true),
    PlanFeature("Soporte prioritario", true),
)

private val BASIC_FEATURES = listOf(
    PlanFeature("3 eventos por mes", true),
    PlanFeature("50 clientes", true),
    PlanFeature("20 productos", true),
    PlanFeature("Reportes básicos", true),
    PlanFeature("Marca personalizada", false),
    PlanFeature("Soporte prioritario", false),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(
    viewModel: SubscriptionViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val activity = context as? Activity
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.initBilling()
    }

    UiEventSnackbarHandler(
        events = viewModel.uiEvents,
        snackbarHostState = snackbarHostState,
        onRetry = viewModel::onRetry,
    )

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Planes y Suscripción") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.restorePurchases() },
                        enabled = uiState.purchasingPackageId == null
                    ) {
                        Text(
                            "Restaurar",
                            color = SolennixTheme.colors.primary,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
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

            // Provider badge + cross-platform cancel instructions
            uiState.provider?.let { provider ->
                item(key = "provider_info") {
                    ProviderInfoSection(provider = provider)
                }
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
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Error,
                                    contentDescription = stringResource(DesignSystemR.string.cd_warning),
                                    tint = SolennixTheme.colors.error
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = state.message,
                                        color = SolennixTheme.colors.error,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                TextButton(onClick = { viewModel.onRetry("billing:fetchOfferings") }) {
                                    Text(
                                        "Reintentar",
                                        color = SolennixTheme.colors.error,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
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
                    text = "Elegí tu plan",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primaryText
                )
            }

            // Basic Plan (Free)
            item {
                PlanCard(
                    planName = "Básico",
                    price = "Gratis",
                    period = "",
                    features = BASIC_FEATURES,
                    isCurrentPlan = !uiState.hasActiveSubscription,
                    isRecommended = false,
                    isPurchasing = false,
                    isAnyPurchaseInProgress = uiState.purchasingPackageId != null,
                    onClick = { /* Free plan, no action */ }
                )
            }

            // Pro Packages — dynamic from RevenueCat, fallback to static cards
            if (uiState.proPackages.isNotEmpty()) {
                items(uiState.proPackages, key = { "pro_${it.identifier}" }) { rcPackage ->
                    val price = rcPackage.product.price.formatted
                    val isYearly = rcPackage.identifier.contains("annual", ignoreCase = true) ||
                            rcPackage.identifier.contains("yearly", ignoreCase = true)
                    PlanCard(
                        planName = "Pro",
                        price = price,
                        period = if (isYearly) "/año" else "/mes",
                        features = PRO_FEATURES,
                        isCurrentPlan = uiState.currentPlanName == "Pro",
                        isRecommended = isYearly,
                        savingsText = if (isYearly) "Ahorrá 20%" else null,
                        isPurchasing = uiState.purchasingPackageId == rcPackage.identifier,
                        isAnyPurchaseInProgress = uiState.purchasingPackageId != null,
                        onClick = {
                            activity?.let { viewModel.launchPurchase(it, rcPackage) }
                        }
                    )
                }
            } else {
                // Fallback static cards when RevenueCat is unavailable
                // Matches iOS fallback prices: $6.99/month, $49.99/year
                item(key = "pro_monthly_fallback") {
                    PlanCard(
                        planName = "Pro",
                        price = "US\$ 6.99",
                        period = "/mes",
                        features = PRO_FEATURES,
                        isCurrentPlan = uiState.currentPlanName == "Pro",
                        isRecommended = false,
                        isPurchasing = false,
                        isAnyPurchaseInProgress = true, // disable clicks — no RC to handle purchase
                        onClick = { }
                    )
                }
                item(key = "pro_yearly_fallback") {
                    PlanCard(
                        planName = "Pro",
                        price = "US\$ 49.99",
                        period = "/año",
                        features = PRO_FEATURES,
                        isCurrentPlan = uiState.currentPlanName == "Pro",
                        isRecommended = true,
                        savingsText = "Ahorrá 40%",
                        isPurchasing = false,
                        isAnyPurchaseInProgress = true, // disable clicks — no RC to handle purchase
                        onClick = { }
                    )
                }
            }

            // Manage subscription — deep-link to Google Play
            if (uiState.hasActiveSubscription && uiState.provider == SubscriptionProvider.GOOGLE) {
                item(key = "manage_sub") {
                    OutlinedButton(
                        onClick = {
                            val intent = Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("https://play.google.com/store/account/subscriptions")
                            )
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        border = ButtonDefaults.outlinedButtonBorder(enabled = true),
                    ) {
                        Icon(
                            imageVector = Icons.Default.ManageAccounts,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Administrar suscripción")
                    }
                }
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
                val cancelAnswer = when (uiState.provider) {
                    SubscriptionProvider.STRIPE ->
                        "Sí, podés cancelar tu suscripción cuando quieras. Como te suscribiste desde la web, ingresá a solennix.com > Configuración > Suscripción."
                    SubscriptionProvider.APPLE ->
                        "Sí, podés cancelar tu suscripción cuando quieras. Como te suscribiste desde iOS, abrí Configuración > tu Apple ID > Suscripciones en tu iPhone o iPad."
                    else ->
                        "Sí, podés cancelar tu suscripción cuando quieras desde la configuración de tu cuenta de Google Play."
                }
                FaqItem(
                    question = "¿Puedo cancelar en cualquier momento?",
                    answer = cancelAnswer
                )
            }

            item {
                FaqItem(
                    question = "¿Qué pasa con mis datos si cancelo?",
                    answer = "Tus datos se mantienen, pero vas a tener acceso limitado según el plan Básico."
                )
            }

            item {
                FaqItem(
                    question = "¿Hay prueba gratuita?",
                    answer = "Sí, el plan Pro incluye 14 días de prueba gratis. Se renueva automáticamente al precio del plan elegido a menos que canceles al menos 24 horas antes de que termine el período de prueba."
                )
            }

            item {
                FaqItem(
                    question = "¿Puedo cambiar de plan?",
                    answer = "Sí, podés actualizar o degradar tu plan en cualquier momento."
                )
            }

            // Legal disclosure (required by Google Play)
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "La suscripción se renueva automáticamente. Podés cancelar en cualquier momento desde Google Play > Suscripciones. Solennix es un producto de Creapolis.",
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.tertiaryText,
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
        }
    }
}

@Composable
fun ProviderInfoSection(provider: SubscriptionProvider) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Provider badge
        Surface(
            color = SolennixTheme.colors.card,
            shape = MaterialTheme.shapes.medium
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = when (provider) {
                        SubscriptionProvider.APPLE -> Icons.Default.PhoneIphone
                        SubscriptionProvider.GOOGLE -> Icons.Default.Shop
                        SubscriptionProvider.STRIPE -> Icons.Default.Language
                    },
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = provider.badge,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }

        // Cross-platform cancel instructions (only when provider != google)
        if (!provider.isCurrentPlatform) {
            Surface(
                color = SolennixTheme.colors.info.copy(alpha = 0.1f),
                shape = MaterialTheme.shapes.medium
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = SolennixTheme.colors.info,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = provider.cancelInstructions,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.primaryText
                    )
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
    isPurchasing: Boolean = false,
    isAnyPurchaseInProgress: Boolean = false,
    onClick: () -> Unit
) {
    val borderColor = when {
        isCurrentPlan -> SolennixTheme.colors.success
        isRecommended -> SolennixTheme.colors.primary
        else -> Color.Transparent
    }

    // The card is clickable only when it's not the current plan AND no purchase is
    // in progress anywhere on the screen. This prevents double-tap submissions.
    val cardClickable = !isCurrentPlan && !isAnyPurchaseInProgress

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (borderColor != Color.Transparent)
                    Modifier.border(2.dp, borderColor, MaterialTheme.shapes.medium)
                else Modifier
            )
            .clickable(enabled = cardClickable, onClick = onClick),
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
                    enabled = cardClickable,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SolennixTheme.colors.primary
                    )
                ) {
                    if (isPurchasing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Procesando...")
                    } else {
                        Text("Seleccionar plan")
                    }
                }
            } else {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(
                    onClick = { },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = false
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = stringResource(DesignSystemR.string.cd_check)
                    )
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
