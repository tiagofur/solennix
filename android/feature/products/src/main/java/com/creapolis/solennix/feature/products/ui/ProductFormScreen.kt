package com.creapolis.solennix.feature.products.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.feature.products.viewmodel.ProductFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFormScreen(
    viewModel: ProductFormViewModel,
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
                title = { Text("Producto") },
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
                    leadingIcon = Icons.Default.ShoppingCart
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.category,
                    onValueChange = { viewModel.category = it },
                    label = "Categoría *",
                    leadingIcon = Icons.Default.Category
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.basePrice,
                    onValueChange = { viewModel.basePrice = it },
                    label = "Precio Base *",
                    leadingIcon = Icons.Default.AttachMoney,
                    keyboardType = KeyboardType.Decimal
                )
                Spacer(modifier = Modifier.height(16.dp))

                SolennixTextField(
                    value = viewModel.imageUrl,
                    onValueChange = { viewModel.imageUrl = it },
                    label = "URL de Imagen",
                    leadingIcon = Icons.Default.Image,
                    keyboardType = KeyboardType.Uri
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
                    onClick = { viewModel.saveProduct() },
                    isLoading = viewModel.isSaving,
                    enabled = viewModel.isFormValid
                )
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
