package com.creapolis.solennix.feature.clients.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocationCity
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.clients.viewmodel.ClientFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientFormScreen(
    viewModel: ClientFormViewModel,
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    val context = LocalContext.current

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            onNavigateBack()
        }
    }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.uploadPhoto(context, it) }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
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
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            AdaptiveCenteredContent(maxWidth = 800.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(scrollState)
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Circular photo picker
                    Box(
                        modifier = Modifier
                            .size(120.dp)
                            .clip(CircleShape)
                            .background(SolennixTheme.colors.surfaceGrouped)
                            .clickable(enabled = !viewModel.isUploadingPhoto) {
                                imagePickerLauncher.launch("image/*")
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        if (viewModel.photoUrl.isNotBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(UrlResolver.resolve(viewModel.photoUrl))
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Foto del cliente",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = SolennixTheme.colors.secondaryText
                            )
                        }

                        // Camera icon overlay
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .size(36.dp)
                                .background(
                                    SolennixTheme.colors.primary,
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (viewModel.isUploadingPhoto) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    strokeWidth = 2.dp,
                                    color = SolennixTheme.colors.card
                                )
                            } else {
                                Icon(
                                    Icons.Default.PhotoCamera,
                                    contentDescription = "Seleccionar foto",
                                    modifier = Modifier.size(18.dp),
                                    tint = SolennixTheme.colors.card
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (viewModel.isUploadingPhoto) "Subiendo foto..."
                        else "Toca para agregar foto",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Form fields — side-by-side on tablet via AdaptiveFormRow
                    AdaptiveFormRow(
                        left = {
                            SolennixTextField(value = viewModel.name, onValueChange = { viewModel.name = it }, label = "Nombre *", leadingIcon = Icons.Default.Person, errorMessage = viewModel.nameError)
                        },
                        right = {
                            SolennixTextField(value = viewModel.phone, onValueChange = { viewModel.phone = it }, label = "Telefono *", leadingIcon = Icons.Default.Phone, keyboardType = KeyboardType.Phone, errorMessage = viewModel.phoneError)
                        }
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    AdaptiveFormRow(
                        left = {
                            SolennixTextField(value = viewModel.email, onValueChange = { viewModel.email = it }, label = "Correo Electronico", leadingIcon = Icons.Default.Email, keyboardType = KeyboardType.Email, errorMessage = viewModel.emailError)
                        },
                        right = {
                            SolennixTextField(value = viewModel.city, onValueChange = { viewModel.city = it }, label = "Ciudad", leadingIcon = Icons.Default.LocationCity)
                        }
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    SolennixTextField(value = viewModel.address, onValueChange = { viewModel.address = it }, label = "Direccion", leadingIcon = Icons.Default.LocationOn)
                    Spacer(modifier = Modifier.height(16.dp))
                    SolennixTextField(value = viewModel.notes, onValueChange = { viewModel.notes = it }, label = "Notas", leadingIcon = Icons.Default.Notes)
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
}
