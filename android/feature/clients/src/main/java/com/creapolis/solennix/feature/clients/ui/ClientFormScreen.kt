package com.creapolis.solennix.feature.clients.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocationCity
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.feature.clients.viewmodel.ClientFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientFormScreen(
    viewModel: ClientFormViewModel,
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cliente") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(16.dp)
            ) {
                SolennixTextField(
                    value = viewModel.name,
                    onValueChange = { viewModel.name = it },
                    label = "Nombre *",
                    leadingIcon = Icons.Default.Person,
                    errorMessage = viewModel.nameError
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.phone,
                    onValueChange = { viewModel.phone = it },
                    label = "Teléfono *",
                    leadingIcon = Icons.Default.Phone,
                    keyboardType = KeyboardType.Phone,
                    errorMessage = viewModel.phoneError
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.email,
                    onValueChange = { viewModel.email = it },
                    label = "Correo Electrónico",
                    leadingIcon = Icons.Default.Email,
                    keyboardType = KeyboardType.Email,
                    errorMessage = viewModel.emailError
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.address,
                    onValueChange = { viewModel.address = it },
                    label = "Dirección",
                    leadingIcon = Icons.Default.LocationOn
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.city,
                    onValueChange = { viewModel.city = it },
                    label = "Ciudad",
                    leadingIcon = Icons.Default.LocationCity
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.notes,
                    onValueChange = { viewModel.notes = it },
                    label = "Notas",
                    leadingIcon = Icons.Default.Notes
                )
                Spacer(modifier = Modifier.height(32.dp))

                if (viewModel.errorMessage != null) {
                    Text(
                        text = viewModel.errorMessage.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                PremiumButton(
                    text = "Guardar",
                    onClick = { viewModel.saveClient() },
                    isLoading = viewModel.isSaving,
                    enabled = !viewModel.isSaving
                )
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
