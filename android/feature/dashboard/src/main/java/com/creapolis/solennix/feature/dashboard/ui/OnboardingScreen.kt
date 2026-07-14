package com.creapolis.solennix.feature.dashboard.ui

import android.content.Context
import androidx.annotation.StringRes
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixGradient
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.Spacing
import com.creapolis.solennix.feature.dashboard.R
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
    val isWideScreen = LocalIsWideScreen.current
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

    if (isWideScreen) {
        OnboardingScreenWide(
            pagerState = pagerState,
            coroutineScope = coroutineScope,
            completeOnboarding = completeOnboarding
        )
    } else {
        OnboardingScreenCompact(
            pagerState = pagerState,
            coroutineScope = coroutineScope,
            completeOnboarding = completeOnboarding
        )
    }
}

@Composable
private fun OnboardingScreenCompact(
    pagerState: PagerState,
    coroutineScope: kotlinx.coroutines.CoroutineScope,
    completeOnboarding: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SolennixTheme.colors.background)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 140.dp)
        ) { page ->
            when (page) {
                0 -> OnboardingPageContent(
                    icon = Icons.Default.AutoAwesome,
                    titleRes = R.string.onboarding_welcome_title,
                    descriptionRes = R.string.onboarding_welcome_desc
                )
                1 -> OnboardingPageContent(
                    icon = Icons.Default.Layers,
                    titleRes = R.string.onboarding_features_title,
                    featuresRes = listOf(
                        R.string.onboarding_feature_clients,
                        R.string.onboarding_feature_quotes,
                        R.string.onboarding_feature_inventory,
                        R.string.onboarding_feature_calendar
                    )
                )
                2 -> OnboardingPageContent(
                    icon = Icons.Default.PhoneAndroid,
                    titleRes = R.string.onboarding_android_title,
                    featuresRes = listOf(
                        R.string.onboarding_android_widgets,
                        R.string.onboarding_android_dark_mode,
                        R.string.onboarding_android_offline,
                        R.string.onboarding_android_notifications,
                        R.string.onboarding_android_tablets
                    )
                )
                3 -> OnboardingPageContent(
                    icon = Icons.Default.RocketLaunch,
                    titleRes = R.string.onboarding_cta_title,
                    descriptionRes = R.string.onboarding_cta_desc
                ) {
                    Spacer(modifier = Modifier.height(Spacing.xxl))
                    PremiumButton(
                        text = stringResource(R.string.onboarding_button_start),
                        onClick = { completeOnboarding() },
                        modifier = Modifier.padding(horizontal = Spacing.md)
                    )
                }
            }
        }

        if (pagerState.currentPage < PAGE_COUNT - 1) {
            TextButton(
                onClick = { completeOnboarding() },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .statusBarsPadding()
                    .padding(end = Spacing.sm, top = Spacing.sm)
            ) {
                Text(
                    text = stringResource(R.string.onboarding_button_skip),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Medium,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }

        OnboardingBottomNavigation(
            pagerState = pagerState,
            coroutineScope = coroutineScope,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = Spacing.xxl, start = Spacing.xl, end = Spacing.xl)
        )
    }
}

@Composable
private fun OnboardingScreenWide(
    pagerState: PagerState,
    coroutineScope: kotlinx.coroutines.CoroutineScope,
    completeOnboarding: () -> Unit
) {
    val pages = listOf(
        OnboardingPageData(
            icon = Icons.Default.AutoAwesome,
            titleRes = R.string.onboarding_welcome_title,
            descriptionRes = R.string.onboarding_welcome_desc
        ),
        OnboardingPageData(
            icon = Icons.Default.Layers,
            titleRes = R.string.onboarding_features_title,
            featuresRes = listOf(
                R.string.onboarding_feature_clients,
                R.string.onboarding_feature_quotes,
                R.string.onboarding_feature_inventory,
                R.string.onboarding_feature_calendar
            )
        ),
        OnboardingPageData(
            icon = Icons.Default.PhoneAndroid,
            titleRes = R.string.onboarding_android_title,
            featuresRes = listOf(
                R.string.onboarding_android_widgets,
                R.string.onboarding_android_dark_mode,
                R.string.onboarding_android_offline,
                R.string.onboarding_android_notifications,
                R.string.onboarding_android_tablets
            )
        ),
        OnboardingPageData(
            icon = Icons.Default.RocketLaunch,
            titleRes = R.string.onboarding_cta_title,
            descriptionRes = R.string.onboarding_cta_desc
        )
    )

    val currentPage = pages[pagerState.currentPage]

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(SolennixTheme.colors.background)
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(0.4f)
                .background(SolennixGradient.premiumBrush),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.padding(40.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = currentPage.icon,
                        contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = Color.White
                    )
                }
                Spacer(modifier = Modifier.height(32.dp))
                Text(
                    text = stringResource(
                        R.string.onboarding_step_counter,
                        pagerState.currentPage + 1,
                        PAGE_COUNT
                    ),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White.copy(alpha = 0.8f)
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .weight(1f)
        ) {
            if (pagerState.currentPage < PAGE_COUNT - 1) {
                TextButton(
                    onClick = { completeOnboarding() },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(end = Spacing.md, top = Spacing.md)
                ) {
                    Text(
                        text = stringResource(R.string.onboarding_button_skip),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Medium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = stringResource(currentPage.titleRes),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primaryText,
                    textAlign = TextAlign.Center
                )

                if (currentPage.descriptionRes != null) {
                    Spacer(modifier = Modifier.height(Spacing.md))
                    Text(
                        text = stringResource(currentPage.descriptionRes),
                        style = MaterialTheme.typography.bodyLarge,
                        color = SolennixTheme.colors.secondaryText,
                        textAlign = TextAlign.Center
                    )
                }

                if (!currentPage.featuresRes.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(Spacing.xl))
                    Column(
                        modifier = Modifier.widthIn(max = 400.dp),
                        verticalArrangement = Arrangement.spacedBy(Spacing.sm)
                    ) {
                        currentPage.featuresRes.forEach { featureRes ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = Spacing.xs)
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
                                    text = stringResource(featureRes),
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = SolennixTheme.colors.primaryText
                                )
                            }
                        }
                    }
                }

                if (pagerState.currentPage == PAGE_COUNT - 1) {
                    Spacer(modifier = Modifier.height(Spacing.xxl))
                    PremiumButton(
                        text = stringResource(R.string.onboarding_button_start),
                        onClick = { completeOnboarding() }
                    )
                }
            }

            OnboardingBottomNavigation(
                pagerState = pagerState,
                coroutineScope = coroutineScope,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(bottom = Spacing.xxl, start = Spacing.xl, end = Spacing.xl)
            )
        }
    }
}

private data class OnboardingPageData(
    val icon: ImageVector,
    @StringRes val titleRes: Int,
    @StringRes val descriptionRes: Int? = null,
    val featuresRes: List<Int>? = null
)

@Composable
private fun OnboardingPageContent(
    icon: ImageVector,
    @StringRes titleRes: Int,
    @StringRes descriptionRes: Int? = null,
    featuresRes: List<Int>? = null,
    footer: @Composable () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = Spacing.xxl)
            .padding(top = 60.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(72.dp),
            tint = SolennixTheme.colors.primary
        )
        Spacer(modifier = Modifier.height(Spacing.xl))
        Text(
            text = stringResource(titleRes),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = SolennixTheme.colors.primaryText,
            textAlign = TextAlign.Center
        )
        if (descriptionRes != null) {
            Spacer(modifier = Modifier.height(Spacing.sm))
            Text(
                text = stringResource(descriptionRes),
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText,
                textAlign = TextAlign.Center
            )
        }
        if (!featuresRes.isNullOrEmpty()) {
            Spacer(modifier = Modifier.height(Spacing.lg))
            featuresRes.forEach { featureRes ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(vertical = Spacing.xs)
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = SolennixTheme.colors.primary
                    )
                    Spacer(modifier = Modifier.width(Spacing.sm))
                    Text(
                        text = stringResource(featureRes),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primaryText
                    )
                }
            }
        }
        footer()
    }
}

@Composable
private fun OnboardingBottomNavigation(
    pagerState: PagerState,
    coroutineScope: kotlinx.coroutines.CoroutineScope,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
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

        if (pagerState.currentPage < PAGE_COUNT - 1) {
            PremiumButton(
                text = stringResource(R.string.onboarding_button_next),
                onClick = {
                    coroutineScope.launch {
                        pagerState.animateScrollToPage(pagerState.currentPage + 1)
                    }
                }
            )
        }
    }
}

fun hasSeenOnboarding(context: Context): Boolean {
    return context.getSharedPreferences(ONBOARDING_PREFS, Context.MODE_PRIVATE)
        .getBoolean(KEY_HAS_SEEN_ONBOARDING, false)
}
