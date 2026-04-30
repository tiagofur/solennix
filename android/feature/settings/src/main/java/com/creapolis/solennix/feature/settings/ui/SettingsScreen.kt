package com.creapolis.solennix.feature.settings.ui

import com.creapolis.solennix.feature.settings.R
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.ThemeConfig
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.settings.viewmodel.SettingsViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onEditProfile: () -> Unit,
    onChangePassword: () -> Unit,
    onBusinessSettings: () -> Unit,
    onContractDefaults: () -> Unit,
    onNotificationPreferences: () -> Unit = {},
    onPricing: () -> Unit,
    onAbout: () -> Unit,
    onPrivacy: () -> Unit,
    onTerms: () -> Unit,
    onDeleteAccount: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onNavigateBack: () -> Unit
) {
    val user by viewModel.currentUser.collectAsStateWithLifecycle()
    val themeConfig by viewModel.themeConfig.collectAsStateWithLifecycle()
    val appLanguage by viewModel.appLanguage.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val languageUpdatedMessage = stringResource(R.string.settings_language_updated)

    var showThemeDialog by remember { mutableStateOf(false) }
    var showLanguageDialog by remember { mutableStateOf(false) }

    if (showThemeDialog) {
        ThemeSelectionDialog(
            currentConfig = themeConfig,
            onConfigSelected = { config ->
                viewModel.updateTheme(config)
                showThemeDialog = false
            },
            onDismiss = { showThemeDialog = false }
        )
    }

    if (showLanguageDialog) {
        LanguageSelectionDialog(
            currentLanguage = appLanguage.ifBlank { user?.preferredLanguage ?: "es" },
            onLanguageSelected = { language ->
                viewModel.updateLanguage(
                    language = language,
                    onSuccess = {
                        showLanguageDialog = false
                        scope.launch {
                            snackbarHostState.showSnackbar(
                                message = languageUpdatedMessage
                            )
                        }
                    },
                    onError = { message ->
                        showLanguageDialog = false
                        scope.launch {
                            snackbarHostState.showSnackbar(message = message)
                        }
                    }
                )
            },
            onDismiss = { showLanguageDialog = false }
        )
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.settings_title)) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 700.dp) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
        ) {
            // User Header
            user?.let {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Avatar(name = it.name, photoUrl = UrlResolver.resolve(it.logoUrl), size = 64.dp)
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = it.name,
                            style = MaterialTheme.typography.titleLarge,
                            color = SolennixTheme.colors.primaryText
                        )
                        Text(
                            text = it.email,
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            }

            val isWide = LocalIsWideScreen.current
            if (isWide) {
                // Tablet: 2-column settings sections
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        SettingsSection(title = stringResource(R.string.settings_section_appearance)) {
                            val themeLabel = when (themeConfig) {
                                ThemeConfig.SYSTEM_DEFAULT -> stringResource(R.string.settings_theme_system_default)
                                ThemeConfig.LIGHT -> stringResource(R.string.settings_theme_light)
                                ThemeConfig.DARK -> stringResource(R.string.settings_theme_dark)
                            }
                            val languageLabel = if (appLanguage.ifBlank { user?.preferredLanguage ?: "es" } == "en") stringResource(R.string.settings_language_option_en) else stringResource(R.string.settings_language_option_es)
                            SettingsItemValue(icon = Icons.Default.Palette, label = stringResource(R.string.settings_theme_label), value = themeLabel, onClick = { showThemeDialog = true })
                            SettingsItemValue(icon = Icons.Default.Language, label = stringResource(R.string.settings_profile_language), value = languageLabel, onClick = { showLanguageDialog = true })
                        }
                        SettingsSection(title = stringResource(R.string.settings_section_account)) {
                            SettingsItem(icon = Icons.Default.Person, label = stringResource(R.string.settings_action_edit_profile), onClick = onEditProfile)
                            SettingsItem(icon = Icons.Default.Lock, label = stringResource(R.string.settings_action_change_password), onClick = onChangePassword)
                            SettingsItem(icon = Icons.Default.Business, label = stringResource(R.string.settings_action_business_settings), onClick = onBusinessSettings)
                            SettingsItem(icon = Icons.Default.Receipt, label = stringResource(R.string.settings_action_contract_defaults), onClick = onContractDefaults)
                            SettingsItem(icon = Icons.Default.Notifications, label = stringResource(R.string.settings_tab_notifications), onClick = onNotificationPreferences)
                            LogoutItem(onClick = { viewModel.logout() })
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        SettingsSection(title = stringResource(R.string.settings_section_subscription)) {
                            SettingsItem(icon = Icons.Default.Star, label = stringResource(R.string.settings_action_manage_plan), onClick = onPricing)
                        }
                        SettingsSection(title = stringResource(R.string.settings_section_information)) {
                            SettingsItem(icon = Icons.Default.Info, label = stringResource(R.string.settings_action_about), onClick = onAbout)
                            SettingsItem(icon = Icons.Default.Shield, label = stringResource(R.string.settings_action_privacy_policy), onClick = onPrivacy)
                            SettingsItem(icon = Icons.Default.Description, label = stringResource(R.string.settings_action_terms_conditions), onClick = onTerms)
                            SettingsItem(icon = Icons.Default.Delete, label = stringResource(R.string.settings_action_delete_account), onClick = onDeleteAccount)
                        }
                    }
                }
            } else {
                SettingsSection(title = stringResource(R.string.settings_section_appearance)) {
                    val themeLabel = when (themeConfig) {
                        ThemeConfig.SYSTEM_DEFAULT -> stringResource(R.string.settings_theme_system_default)
                        ThemeConfig.LIGHT -> stringResource(R.string.settings_theme_light)
                        ThemeConfig.DARK -> stringResource(R.string.settings_theme_dark)
                    }
                    val languageLabel = if (appLanguage.ifBlank { user?.preferredLanguage ?: "es" } == "en") stringResource(R.string.settings_language_option_en) else stringResource(R.string.settings_language_option_es)
                    SettingsItemValue(icon = Icons.Default.Palette, label = stringResource(R.string.settings_theme_label), value = themeLabel, onClick = { showThemeDialog = true })
                    SettingsItemValue(icon = Icons.Default.Language, label = stringResource(R.string.settings_profile_language), value = languageLabel, onClick = { showLanguageDialog = true })
                }
                SettingsSection(title = stringResource(R.string.settings_section_account)) {
                    SettingsItem(icon = Icons.Default.Person, label = stringResource(R.string.settings_action_edit_profile), onClick = onEditProfile)
                    SettingsItem(icon = Icons.Default.Lock, label = stringResource(R.string.settings_action_change_password), onClick = onChangePassword)
                    SettingsItem(icon = Icons.Default.Business, label = stringResource(R.string.settings_action_business_settings), onClick = onBusinessSettings)
                    SettingsItem(icon = Icons.Default.Receipt, label = stringResource(R.string.settings_action_contract_defaults), onClick = onContractDefaults)
                    SettingsItem(icon = Icons.Default.Notifications, label = stringResource(R.string.settings_tab_notifications), onClick = onNotificationPreferences)
                    LogoutItem(onClick = { viewModel.logout() })
                }
                SettingsSection(title = stringResource(R.string.settings_section_subscription)) {
                    SettingsItem(icon = Icons.Default.Star, label = stringResource(R.string.settings_action_manage_plan), onClick = onPricing)
                }
                SettingsSection(title = stringResource(R.string.settings_section_information)) {
                    SettingsItem(icon = Icons.Default.Info, label = stringResource(R.string.settings_action_about), onClick = onAbout)
                    SettingsItem(icon = Icons.Default.Shield, label = stringResource(R.string.settings_action_privacy_policy), onClick = onPrivacy)
                    SettingsItem(icon = Icons.Default.Description, label = stringResource(R.string.settings_action_terms_conditions), onClick = onTerms)
                    SettingsItem(icon = Icons.Default.Delete, label = stringResource(R.string.settings_action_delete_account), onClick = onDeleteAccount)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
        }
    }
}

@Composable
fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = title,
            modifier = Modifier.padding(start = 16.dp, top = 24.dp, bottom = 8.dp),
            style = MaterialTheme.typography.labelLarge,
            color = SolennixTheme.colors.primary
        )
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.medium,
            color = SolennixTheme.colors.card
        ) {
            Column(content = content)
        }
    }
}

@Composable
fun SettingsItem(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    ListItem(
        headlineContent = { Text(label) },
        leadingContent = { Icon(icon, contentDescription = null, tint = SolennixTheme.colors.secondaryText) },
        trailingContent = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null) },
        modifier = Modifier.clickable(onClick = onClick)
    )
    HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = SolennixTheme.colors.divider.copy(alpha = 0.5f))
}

@Composable
fun SettingsItemValue(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = { Text(label) },
        supportingContent = { Text(value, color = SolennixTheme.colors.secondaryText) },
        leadingContent = { Icon(icon, contentDescription = null, tint = SolennixTheme.colors.secondaryText) },
        modifier = Modifier.clickable(onClick = onClick)
    )
    HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = SolennixTheme.colors.divider.copy(alpha = 0.5f))
}

@Composable
fun LogoutItem(onClick: () -> Unit) {
    ListItem(
        headlineContent = {
            Text(stringResource(R.string.settings_action_logout), color = SolennixTheme.colors.error)
        },
        leadingContent = {
            Icon(
                imageVector = Icons.Default.Logout,
                contentDescription = stringResource(DesignSystemR.string.cd_logout),
                tint = SolennixTheme.colors.error
            )
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}

@Composable
fun ThemeSelectionDialog(
    currentConfig: ThemeConfig,
    onConfigSelected: (ThemeConfig) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(text = stringResource(R.string.settings_theme_choose))
        },
        text = {
            Column(modifier = Modifier.selectableGroup()) {
                val themeOptions = listOf(
                    ThemeConfig.SYSTEM_DEFAULT to stringResource(R.string.settings_theme_system_default),
                    ThemeConfig.LIGHT to stringResource(R.string.settings_theme_light),
                    ThemeConfig.DARK to stringResource(R.string.settings_theme_dark)
                )

                themeOptions.forEach { (config, label) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = (config == currentConfig),
                                onClick = { onConfigSelected(config) },
                                role = Role.RadioButton
                            )
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = (config == currentConfig),
                            onClick = null // onClick is handled by Row modifier
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = label,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel))
            }
        }
    )
}

@Composable
fun LanguageSelectionDialog(
    currentLanguage: String,
    onLanguageSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(text = stringResource(R.string.settings_language_choose))
        },
        text = {
            Column(modifier = Modifier.selectableGroup()) {
                val languageOptions = listOf(
                    "es" to stringResource(R.string.settings_language_option_es),
                    "en" to stringResource(R.string.settings_language_option_en)
                )

                languageOptions.forEach { (code, label) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = (code == currentLanguage),
                                onClick = { onLanguageSelected(code) },
                                role = Role.RadioButton
                            )
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = (code == currentLanguage), onClick = null)
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(text = label, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel))
            }
        }
    )
}
