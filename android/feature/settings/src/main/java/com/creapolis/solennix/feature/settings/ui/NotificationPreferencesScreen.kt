package com.creapolis.solennix.feature.settings.ui

import com.creapolis.solennix.feature.settings.R
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.viewmodel.NotificationPreferencesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationPreferencesScreen(
    viewModel: NotificationPreferencesViewModel,
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.settings_notifications_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 600.dp) {
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = SolennixTheme.colors.primary)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
            ) {
                viewModel.errorMessage?.let { error ->
                    Text(
                        text = error,
                        color = SolennixTheme.colors.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                // Email section
                SectionHeader(stringResource(R.string.settings_notifications_email_section))

                PreferenceSwitch(
                    label = stringResource(R.string.settings_notifications_email_payment_receipt),
                    description = stringResource(R.string.settings_notifications_email_payment_receipt_hint),
                    checked = viewModel.emailPaymentReceipt,
                    onCheckedChange = { viewModel.togglePreference { viewModel.emailPaymentReceipt = it } }
                )
                PreferenceSwitch(
                    label = stringResource(R.string.settings_notifications_email_event_reminder),
                    description = stringResource(R.string.settings_notifications_email_event_reminder_hint),
                    checked = viewModel.emailEventReminder,
                    onCheckedChange = { viewModel.togglePreference { viewModel.emailEventReminder = it } }
                )
                PreferenceSwitch(
                    label = stringResource(R.string.settings_notifications_email_subscription_updates),
                    description = stringResource(R.string.settings_notifications_email_subscription_updates_hint),
                    checked = viewModel.emailSubscriptionUpdates,
                    onCheckedChange = { viewModel.togglePreference { viewModel.emailSubscriptionUpdates = it } }
                )
                PreferenceSwitch(
                    label = stringResource(R.string.settings_notifications_email_weekly_summary),
                    description = stringResource(R.string.settings_notifications_email_weekly_summary_hint),
                    checked = viewModel.emailWeeklySummary,
                    onCheckedChange = { viewModel.togglePreference { viewModel.emailWeeklySummary = it } }
                )
                PreferenceSwitch(
                    label = stringResource(R.string.settings_notifications_email_marketing),
                    description = stringResource(R.string.settings_notifications_email_marketing_hint),
                    checked = viewModel.emailMarketing,
                    onCheckedChange = { viewModel.togglePreference { viewModel.emailMarketing = it } }
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Push section
                SectionHeader(stringResource(R.string.settings_notifications_push_section))

                PreferenceSwitch(
                    label = stringResource(R.string.settings_notifications_push_enabled),
                    description = stringResource(R.string.settings_notifications_push_enabled_hint),
                    checked = viewModel.pushEnabled,
                    onCheckedChange = { viewModel.togglePreference { viewModel.pushEnabled = it } }
                )

                val pushAlpha = if (viewModel.pushEnabled) 1f else 0.5f
                Column(modifier = Modifier.alpha(pushAlpha)) {
                    PreferenceSwitch(
                        label = stringResource(R.string.settings_notifications_push_event_reminder),
                        description = stringResource(R.string.settings_notifications_push_event_reminder_hint),
                        checked = viewModel.pushEventReminder,
                        onCheckedChange = { if (viewModel.pushEnabled) viewModel.togglePreference { viewModel.pushEventReminder = it } },
                        enabled = viewModel.pushEnabled
                    )
                    PreferenceSwitch(
                        label = stringResource(R.string.settings_notifications_push_payment_received),
                        description = stringResource(R.string.settings_notifications_push_payment_received_hint),
                        checked = viewModel.pushPaymentReceived,
                        onCheckedChange = { if (viewModel.pushEnabled) viewModel.togglePreference { viewModel.pushPaymentReceived = it } },
                        enabled = viewModel.pushEnabled
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        modifier = Modifier.padding(start = 16.dp, top = 24.dp, bottom = 8.dp),
        style = MaterialTheme.typography.labelLarge,
        color = SolennixTheme.colors.primary
    )
}

@Composable
private fun PreferenceSwitch(
    label: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    enabled: Boolean = true
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SolennixTheme.colors.card
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 16.dp)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyLarge,
                    color = SolennixTheme.colors.primaryText
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                enabled = enabled,
                colors = SwitchDefaults.colors(
                    checkedTrackColor = SolennixTheme.colors.primary
                )
            )
        }
    }
    HorizontalDivider(color = SolennixTheme.colors.border)
}
