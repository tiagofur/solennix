package com.creapolis.solennix.feature.settings.ui

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.creapolis.solennix.feature.settings.R
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
import androidx.compose.ui.platform.LocalConfiguration
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
import com.creapolis.solennix.core.model.SubscriptionInfo
import com.creapolis.solennix.core.model.SubscriptionProvider
import com.creapolis.solennix.feature.settings.billing.BillingState
import com.creapolis.solennix.feature.settings.viewmodel.SubscriptionViewModel
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(
    viewModel: SubscriptionViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val activity = context as? Activity
    val snackbarHostState = remember { SnackbarHostState() }
    val proPlanName = stringResource(R.string.settings_subscription_plan_pro)
    val basicPlanName = stringResource(R.string.settings_subscription_plan_basic)
    val proFeatures = remember(configuration) {
        listOf(
            PlanFeature(context.getString(R.string.settings_subscription_pro_feature_events), true),
            PlanFeature(context.getString(R.string.settings_subscription_pro_feature_clients), true),
            PlanFeature(context.getString(R.string.settings_subscription_pro_feature_products), true),
            PlanFeature(context.getString(R.string.settings_subscription_pro_feature_reports), true),
            PlanFeature(context.getString(R.string.settings_subscription_pro_feature_widgets), true),
            PlanFeature(context.getString(R.string.settings_subscription_pro_feature_branding), true),
            PlanFeature(context.getString(R.string.settings_subscription_pro_feature_support), true),
        )
    }
    val basicFeatures = remember(configuration) {
        listOf(
            PlanFeature(context.getString(R.string.settings_subscription_basic_feature_events), true),
            PlanFeature(context.getString(R.string.settings_subscription_basic_feature_clients), true),
            PlanFeature(context.getString(R.string.settings_subscription_basic_feature_products), true),
            PlanFeature(context.getString(R.string.settings_subscription_basic_feature_reports), true),
            PlanFeature(context.getString(R.string.settings_subscription_basic_feature_branding), false),
            PlanFeature(context.getString(R.string.settings_subscription_basic_feature_support), false),
        )
    }

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
                title = { Text(stringResource(R.string.settings_subscription_title)) },
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
                            stringResource(R.string.settings_subscription_restore),
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
                    isActive = uiState.hasActiveSubscription,
                    subscription = uiState.subscription,
                )
            }

            // Provider badge + cross-platform cancel instructions
            uiState.provider?.let { provider ->
                item(key = "provider_info") {
                    ProviderInfoSection(
                        provider = provider,
                        sourceBadge = uiState.subscription?.sourceBadge,
                        cancelInstructions = uiState.subscription?.cancelInstructions,
                    )
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
                                        stringResource(R.string.settings_subscription_retry),
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
                    text = stringResource(R.string.settings_subscription_choose_plan),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primaryText
                )
            }

            // Basic Plan (Free)
            item {
                PlanCard(
                    planName = basicPlanName,
                    price = stringResource(R.string.settings_subscription_price_free),
                    period = "",
                    features = basicFeatures,
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
                        planName = proPlanName,
                        price = price,
                        period = if (isYearly) stringResource(R.string.settings_subscription_interval_year) else stringResource(R.string.settings_subscription_interval_month),
                        features = proFeatures,
                        isCurrentPlan = uiState.currentPlanName == proPlanName,
                        isRecommended = isYearly,
                        savingsText = if (isYearly) stringResource(R.string.settings_subscription_savings_20) else null,
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
                        planName = proPlanName,
                        price = stringResource(R.string.settings_subscription_fallback_price_monthly),
                        period = stringResource(R.string.settings_subscription_interval_month),
                        features = proFeatures,
                        isCurrentPlan = uiState.currentPlanName == proPlanName,
                        isRecommended = false,
                        isPurchasing = false,
                        isAnyPurchaseInProgress = true, // disable clicks — no RC to handle purchase
                        onClick = { }
                    )
                }
                item(key = "pro_yearly_fallback") {
                    PlanCard(
                        planName = proPlanName,
                        price = stringResource(R.string.settings_subscription_fallback_price_yearly),
                        period = stringResource(R.string.settings_subscription_interval_year),
                        features = proFeatures,
                        isCurrentPlan = uiState.currentPlanName == proPlanName,
                        isRecommended = true,
                        savingsText = stringResource(R.string.settings_subscription_savings_40),
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
                        Text(stringResource(R.string.settings_subscription_manage))
                    }
                }
            }

            // FAQ Section
            item {
                Column {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.settings_subscription_faq_title),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primaryText
                    )
                }
            }

            item {
                val cancelAnswer = when (uiState.provider) {
                    SubscriptionProvider.STRIPE ->
                        stringResource(R.string.settings_subscription_faq_cancel_answer_web)
                    SubscriptionProvider.APPLE ->
                        stringResource(R.string.settings_subscription_faq_cancel_answer_ios)
                    else ->
                        stringResource(R.string.settings_subscription_faq_cancel_answer_android)
                }
                FaqItem(
                    question = stringResource(R.string.settings_subscription_faq_cancel_question),
                    answer = cancelAnswer
                )
            }

            item {
                FaqItem(
                    question = stringResource(R.string.settings_subscription_faq_data_question),
                    answer = stringResource(R.string.settings_subscription_faq_data_answer)
                )
            }

            item {
                FaqItem(
                    question = stringResource(R.string.settings_subscription_faq_trial_question),
                    answer = stringResource(R.string.settings_subscription_faq_trial_answer)
                )
            }

            item {
                FaqItem(
                    question = stringResource(R.string.settings_subscription_faq_change_question),
                    answer = stringResource(R.string.settings_subscription_faq_change_answer)
                )
            }

            // Legal disclosure (required by Google Play)
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = stringResource(R.string.settings_subscription_legal),
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
fun ProviderInfoSection(
    provider: SubscriptionProvider,
    sourceBadge: String?,
    cancelInstructions: String?,
) {
    val badgeText = sourceBadge?.takeIf { it.isNotBlank() } ?: providerBadgeFallback(provider)
    val instructionsText =
        cancelInstructions?.takeIf { it.isNotBlank() } ?: providerCancelFallback(provider)

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
                    text = badgeText,
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
                        text = instructionsText,
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
    isActive: Boolean,
    subscription: SubscriptionInfo? = null,
) {
    val locale = LocalConfiguration.current.locales[0] ?: Locale.getDefault()
    val renewalLine = subscription?.let { renewalLine(it, locale) }
    val priceLine = subscription?.let { priceLine(it, locale) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = SolennixTheme.colors.primaryLight
        ),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = stringResource(R.string.settings_subscription_plan_current),
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
                    val cancelPending = subscription?.cancelAtPeriodEnd == true
                    Surface(
                        color = if (cancelPending)
                            SolennixTheme.colors.warning.copy(alpha = 0.2f)
                        else
                            SolennixTheme.colors.success.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = if (cancelPending) stringResource(R.string.settings_subscription_status_cancel_pending) else stringResource(R.string.settings_subscription_status_active),
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            color = if (cancelPending)
                                SolennixTheme.colors.warning
                            else
                                SolennixTheme.colors.success,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            if (priceLine != null) {
                Text(
                    text = priceLine,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.primaryText,
                )
            }
            if (renewalLine != null) {
                Text(
                    text = renewalLine,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                )
            }
        }
    }
}

@Composable
private fun renewalLine(subscription: SubscriptionInfo, locale: Locale): String? {
    val iso = subscription.currentPeriodEnd?.takeIf { it.isNotBlank() } ?: return null
    val formatted = runCatching {
        val parsed = OffsetDateTime.parse(iso)
        parsed.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(locale))
    }.getOrNull() ?: return null
    return if (subscription.cancelAtPeriodEnd) {
        stringResource(R.string.settings_subscription_expires_on, formatted)
    } else {
        stringResource(R.string.settings_subscription_renews_on, formatted)
    }
}

@Composable
private fun priceLine(subscription: SubscriptionInfo, locale: Locale): String? {
    val cents = subscription.amountCents ?: return null
    val currency = subscription.currency ?: return null
    val interval = when (subscription.billingInterval) {
        "month" -> stringResource(R.string.settings_subscription_interval_month)
        "year" -> stringResource(R.string.settings_subscription_interval_year)
        else -> ""
    }
    val amount = cents / 100.0
    val formatted = String.format(locale, "%.2f", amount)
    return "${currency.uppercase(Locale.ROOT)} $formatted$interval"
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
                                text = stringResource(R.string.settings_subscription_recommended),
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
                        Text(stringResource(R.string.settings_subscription_processing))
                    } else {
                        Text(stringResource(R.string.settings_subscription_select_plan))
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
                    Text(stringResource(R.string.settings_subscription_current_plan_button))
                }
            }
        }
    }
}

@Composable
private fun providerBadgeFallback(provider: SubscriptionProvider): String = when (provider) {
    SubscriptionProvider.STRIPE -> stringResource(R.string.settings_subscription_provider_web)
    SubscriptionProvider.APPLE -> stringResource(R.string.settings_subscription_provider_ios)
    SubscriptionProvider.GOOGLE -> stringResource(R.string.settings_subscription_provider_android)
}

@Composable
private fun providerCancelFallback(provider: SubscriptionProvider): String = when (provider) {
    SubscriptionProvider.STRIPE -> stringResource(R.string.settings_subscription_cancel_web)
    SubscriptionProvider.APPLE -> stringResource(R.string.settings_subscription_cancel_ios)
    SubscriptionProvider.GOOGLE -> stringResource(R.string.settings_subscription_cancel_android)
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
