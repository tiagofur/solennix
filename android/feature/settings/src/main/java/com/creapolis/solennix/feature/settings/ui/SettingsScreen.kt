package com.creapolis.solennix.feature.settings.ui

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
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.ThemeConfig
import com.creapolis.solennix.feature.settings.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onEditProfile: () -> Unit,
    onChangePassword: () -> Unit,
    onBusinessSettings: () -> Unit,
    onContractDefaults: () -> Unit,
    onPricing: () -> Unit,
    onEventFormLinks: () -> Unit = {},
    onAbout: () -> Unit,
    onPrivacy: () -> Unit,
    onTerms: () -> Unit,
    onSearchClick: () -> Unit = {},
    onNavigateBack: () -> Unit
) {
    val user by viewModel.currentUser.collectAsStateWithLifecycle()
    val themeConfig by viewModel.themeConfig.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    var showThemeDialog by remember { mutableStateOf(false) }

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

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Ajustes") },
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
        }
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
                    Avatar(name = it.name, photoUrl = it.logoUrl, size = 64.dp)
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
                        SettingsSection(title = "Apariencia") {
                            val themeLabel = when (themeConfig) {
                                ThemeConfig.SYSTEM_DEFAULT -> "Predeterminado del Sistema"
                                ThemeConfig.LIGHT -> "Claro"
                                ThemeConfig.DARK -> "Oscuro"
                            }
                            SettingsItemValue(icon = Icons.Default.Palette, label = "Tema", value = themeLabel, onClick = { showThemeDialog = true })
                        }
                        SettingsSection(title = "Cuenta") {
                            SettingsItem(icon = Icons.Default.Person, label = "Editar Perfil", onClick = onEditProfile)
                            SettingsItem(icon = Icons.Default.Lock, label = "Cambiar Contraseña", onClick = onChangePassword)
                            SettingsItem(icon = Icons.Default.Business, label = "Ajustes del Negocio", onClick = onBusinessSettings)
                            SettingsItem(icon = Icons.Default.Receipt, label = "Valores del Contrato", onClick = onContractDefaults)
                            SettingsItem(icon = Icons.Default.Link, label = "Enlaces de Formulario", onClick = onEventFormLinks)
                            LogoutItem(onClick = { viewModel.logout() })
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        SettingsSection(title = "Suscripción") {
                            SettingsItem(icon = Icons.Default.Star, label = "Gestionar Plan", onClick = onPricing)
                        }
                        SettingsSection(title = "Información") {
                            SettingsItem(icon = Icons.Default.Info, label = "Acerca de", onClick = onAbout)
                            SettingsItem(icon = Icons.Default.Shield, label = "Política de Privacidad", onClick = onPrivacy)
                            SettingsItem(icon = Icons.Default.Description, label = "Términos y Condiciones", onClick = onTerms)
                        }
                    }
                }
            } else {
                SettingsSection(title = "Apariencia") {
                    val themeLabel = when (themeConfig) {
                        ThemeConfig.SYSTEM_DEFAULT -> "Predeterminado del Sistema"
                        ThemeConfig.LIGHT -> "Claro"
                        ThemeConfig.DARK -> "Oscuro"
                    }
                    SettingsItemValue(icon = Icons.Default.Palette, label = "Tema", value = themeLabel, onClick = { showThemeDialog = true })
                }
                SettingsSection(title = "Cuenta") {
                    SettingsItem(icon = Icons.Default.Person, label = "Editar Perfil", onClick = onEditProfile)
                    SettingsItem(icon = Icons.Default.Lock, label = "Cambiar Contraseña", onClick = onChangePassword)
                    SettingsItem(icon = Icons.Default.Business, label = "Ajustes del Negocio", onClick = onBusinessSettings)
                    SettingsItem(icon = Icons.Default.Receipt, label = "Valores del Contrato", onClick = onContractDefaults)
                    SettingsItem(icon = Icons.Default.Link, label = "Enlaces de Formulario", onClick = onEventFormLinks)
                    LogoutItem(onClick = { viewModel.logout() })
                }
                SettingsSection(title = "Suscripción") {
                    SettingsItem(icon = Icons.Default.Star, label = "Gestionar Plan", onClick = onPricing)
                }
                SettingsSection(title = "Información") {
                    SettingsItem(icon = Icons.Default.Info, label = "Acerca de", onClick = onAbout)
                    SettingsItem(icon = Icons.Default.Shield, label = "Política de Privacidad", onClick = onPrivacy)
                    SettingsItem(icon = Icons.Default.Description, label = "Términos y Condiciones", onClick = onTerms)
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
            Text("Cerrar Sesión", color = SolennixTheme.colors.error)
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
            Text(text = "Elegir tema")
        },
        text = {
            Column(modifier = Modifier.selectableGroup()) {
                val themeOptions = listOf(
                    ThemeConfig.SYSTEM_DEFAULT to "Predeterminado del Sistema",
                    ThemeConfig.LIGHT to "Claro",
                    ThemeConfig.DARK to "Oscuro"
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
                Text("Cancelar")
            }
        }
    )
}
