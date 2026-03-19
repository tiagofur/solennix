package com.creapolis.solennix.feature.settings.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
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
    onAbout: () -> Unit,
    onPrivacy: () -> Unit,
    onTerms: () -> Unit
) {
    val user by viewModel.currentUser.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Ajustes") })
        }
    ) { padding ->
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

            SettingsSection(title = "Cuenta") {
                SettingsItem(icon = Icons.Default.Person, label = "Editar Perfil", onClick = onEditProfile)
                SettingsItem(icon = Icons.Default.Lock, label = "Cambiar Contraseña", onClick = onChangePassword)
                SettingsItem(icon = Icons.Default.Business, label = "Ajustes del Negocio", onClick = onBusinessSettings)
                SettingsItem(icon = Icons.Default.Receipt, label = "Valores del Contrato", onClick = onContractDefaults)
            }

            SettingsSection(title = "Suscripción") {
                SettingsItem(icon = Icons.Default.Star, label = "Gestionar Plan", onClick = onPricing)
            }

            SettingsSection(title = "Información") {
                SettingsItem(icon = Icons.Default.Info, label = "Acerca de", onClick = onAbout)
                SettingsItem(icon = Icons.Default.Shield, label = "Política de Privacidad", onClick = onPrivacy)
                SettingsItem(icon = Icons.Default.Description, label = "Términos y Condiciones", onClick = onTerms)
            }

            Spacer(modifier = Modifier.height(32.dp))

            TextButton(
                onClick = { viewModel.logout() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
            ) {
                Icon(Icons.Default.Logout, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Cerrar Sesion")
            }

            Spacer(modifier = Modifier.height(32.dp))
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
        trailingContent = { Icon(Icons.Default.KeyboardArrowRight, contentDescription = null) },
        modifier = Modifier.clickable(onClick = onClick)
    )
    HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = SolennixTheme.colors.divider.copy(alpha = 0.5f))
}
