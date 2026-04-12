package com.creapolis.solennix.feature.settings.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.settings.viewmodel.BusinessSettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessSettingsScreen(
    viewModel: BusinessSettingsViewModel,
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
        uri?.let {
            val inputStream = context.contentResolver.openInputStream(it)
            val bytes = inputStream?.readBytes()
            inputStream?.close()
            if (bytes != null) {
                viewModel.uploadLogo(bytes)
            }
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Ajustes del Negocio") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = SolennixTheme.colors.primary)
            }
        } else {
            AdaptiveCenteredContent(maxWidth = 700.dp) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(16.dp)
            ) {
                // Logo Section
                Text(
                    text = "Logo",
                    style = MaterialTheme.typography.labelLarge,
                    color = SolennixTheme.colors.primary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    color = SolennixTheme.colors.card,
                    tonalElevation = 1.dp
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Logo preview
                        val resolvedLogoUrl = viewModel.logoUrl?.let { UrlResolver.resolve(it) }

                        if (resolvedLogoUrl != null) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(resolvedLogoUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Logo del negocio",
                                modifier = Modifier
                                    .size(100.dp)
                                    .clip(RoundedCornerShape(12.dp)),
                                contentScale = ContentScale.Fit
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(100.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(SolennixTheme.colors.surfaceGrouped),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.Business,
                                    contentDescription = null,
                                    modifier = Modifier.size(32.dp),
                                    tint = SolennixTheme.colors.secondaryText
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Upload button
                        OutlinedButton(
                            onClick = { imagePickerLauncher.launch("image/*") },
                            enabled = !viewModel.isUploadingLogo
                        ) {
                            if (viewModel.isUploadingLogo) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp,
                                    color = SolennixTheme.colors.primary
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Subiendo...")
                            } else {
                                Icon(
                                    Icons.Default.PhotoCamera,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    if (viewModel.logoUrl != null) "Cambiar Logo"
                                    else "Subir Logo"
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Tu logo aparecerá en los contratos y cotizaciones que generes.",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Business Name & Brand Color — side-by-side on tablet
                var showColorPicker by remember { mutableStateOf(false) }

                AdaptiveFormRow(
                    left = {
                    // Business Name Section
                    Column {
                        Text(
                            text = "Nombre del Negocio",
                            style = MaterialTheme.typography.labelLarge,
                            color = SolennixTheme.colors.primary,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.medium,
                            color = SolennixTheme.colors.card,
                            tonalElevation = 1.dp
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                SolennixTextField(
                                    value = viewModel.businessName,
                                    onValueChange = { viewModel.businessName = it },
                                    label = "Nombre del negocio",
                                    leadingIcon = Icons.Default.Business
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Mostrar en PDFs",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    Switch(
                                        checked = viewModel.showBusinessNameInPdf,
                                        onCheckedChange = { viewModel.showBusinessNameInPdf = it },
                                        colors = SwitchDefaults.colors(
                                            checkedTrackColor = SolennixTheme.colors.primary
                                        )
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Si activás esta opción, tu nombre comercial aparecerá en los documentos en lugar de tu nombre personal.",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )
                    }
                    },
                    right = {
                    // Brand Color Section
                    Column {
                        Text(
                            text = "Identidad Visual",
                            style = MaterialTheme.typography.labelLarge,
                            color = SolennixTheme.colors.primary,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.medium,
                            color = SolennixTheme.colors.card,
                            tonalElevation = 1.dp
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Color de marca",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = SolennixTheme.colors.primaryText,
                                    modifier = Modifier.padding(bottom = 12.dp)
                                )

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .background(parseHexColor(viewModel.brandColor))
                                            .border(
                                                1.dp,
                                                SolennixTheme.colors.secondaryText.copy(alpha = 0.3f),
                                                CircleShape
                                            )
                                    )

                                    Spacer(modifier = Modifier.width(12.dp))

                                    Text(
                                        text = viewModel.brandColor.uppercase(),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontFamily = FontFamily.Monospace,
                                        color = SolennixTheme.colors.secondaryText
                                    )

                                    Spacer(modifier = Modifier.weight(1f))

                                    TextButton(onClick = { showColorPicker = true }) {
                                        Text(
                                            text = "Personalizar",
                                            color = SolennixTheme.colors.primary
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Este color se usara como acento en los documentos PDF que generes.",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )
                    }
                    }
                )

                if (showColorPicker) {
                    ColorPickerDialog(
                        initialColor = viewModel.brandColor,
                        onDismiss = { showColorPicker = false },
                        onConfirm = { hex ->
                            viewModel.brandColor = hex
                            showColorPicker = false
                        }
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                if (viewModel.errorMessage != null) {
                    Text(
                        text = viewModel.errorMessage.orEmpty(),
                        color = SolennixTheme.colors.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                PremiumButton(
                    text = "Guardar",
                    onClick = { viewModel.saveBusinessSettings() },
                    isLoading = viewModel.isSaving,
                    enabled = !viewModel.isSaving
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
            }
        }
    }
}

@Composable
private fun ColorPickerDialog(
    initialColor: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    val initialHsv = remember(initialColor) { hexToHsv(initialColor) }

    var hue by remember { mutableFloatStateOf(initialHsv[0]) }
    var saturation by remember { mutableFloatStateOf(initialHsv[1]) }
    var value by remember { mutableFloatStateOf(initialHsv[2]) }
    var hexInput by remember { mutableStateOf(initialColor.uppercase()) }

    val currentColor = remember(hue, saturation, value) {
        Color.hsv(hue, saturation, value)
    }

    LaunchedEffect(hue, saturation, value) {
        hexInput = colorToHex(currentColor)
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = SolennixTheme.colors.card,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth()
            ) {
                Text(
                    text = "Selector de color",
                    style = MaterialTheme.typography.titleLarge,
                    color = SolennixTheme.colors.primaryText
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Color preview
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(currentColor)
                        .border(
                            1.dp,
                            SolennixTheme.colors.secondaryText.copy(alpha = 0.3f),
                            RoundedCornerShape(12.dp)
                        )
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Hue slider
                ColorSliderRow(
                    label = "Tono",
                    value = hue,
                    onValueChange = { hue = it },
                    valueRange = 0f..360f,
                    gradientColors = (0..360 step 30).map { Color.hsv(it.toFloat(), 1f, 1f) }
                )

                // Saturation slider
                ColorSliderRow(
                    label = "Saturación",
                    value = saturation,
                    onValueChange = { saturation = it },
                    valueRange = 0f..1f,
                    gradientColors = listOf(
                        Color.hsv(hue, 0f, value),
                        Color.hsv(hue, 1f, value)
                    )
                )

                // Brightness slider
                ColorSliderRow(
                    label = "Brillo",
                    value = value,
                    onValueChange = { value = it },
                    valueRange = 0f..1f,
                    gradientColors = listOf(
                        Color.hsv(hue, saturation, 0f),
                        Color.hsv(hue, saturation, 1f)
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Hex input
                OutlinedTextField(
                    value = hexInput,
                    onValueChange = { newValue ->
                        val sanitized = newValue.uppercase().filter { it in "0123456789ABCDEF#" }
                        if (sanitized.length <= 7) {
                            hexInput = sanitized
                            if (sanitized.length == 7 && sanitized.startsWith("#")) {
                                val hsv = hexToHsv(sanitized)
                                hue = hsv[0]
                                saturation = hsv[1]
                                value = hsv[2]
                            }
                        }
                    },
                    label = { Text("Código HEX") },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(
                        fontFamily = FontFamily.Monospace
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        focusedLabelColor = SolennixTheme.colors.primary,
                        cursorColor = SolennixTheme.colors.primary
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text(
                            text = "Cancelar",
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    TextButton(onClick = { onConfirm(hexInput) }) {
                        Text(
                            text = "Aceptar",
                            color = SolennixTheme.colors.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ColorSliderRow(
    label: String,
    value: Float,
    onValueChange: (Float) -> Unit,
    valueRange: ClosedFloatingPointRange<Float>,
    gradientColors: List<Color>
) {
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        color = SolennixTheme.colors.secondaryText
    )
    Spacer(modifier = Modifier.height(4.dp))
    Box(contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(24.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Brush.horizontalGradient(gradientColors))
        )
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = valueRange,
            colors = SliderDefaults.colors(
                thumbColor = SolennixTheme.colors.primary,
                activeTrackColor = Color.Transparent,
                inactiveTrackColor = Color.Transparent
            )
        )
    }
    Spacer(modifier = Modifier.height(8.dp))
}

private fun hexToHsv(hex: String): FloatArray {
    val sanitized = hex.removePrefix("#")
    return try {
        val androidColor = android.graphics.Color.parseColor("#$sanitized")
        val hsv = FloatArray(3)
        android.graphics.Color.colorToHSV(androidColor, hsv)
        hsv
    } catch (e: Exception) {
        floatArrayOf(210f, 1f, 1f) // Default to blue
    }
}

private fun colorToHex(color: Color): String {
    val red = (color.red * 255).toInt().coerceIn(0, 255)
    val green = (color.green * 255).toInt().coerceIn(0, 255)
    val blue = (color.blue * 255).toInt().coerceIn(0, 255)
    return "#%02X%02X%02X".format(red, green, blue)
}

private fun parseHexColor(hex: String): androidx.compose.ui.graphics.Color {
    val sanitized = hex.removePrefix("#")
    return try {
        androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor("#$sanitized"))
    } catch (e: Exception) {
        androidx.compose.ui.graphics.Color(0xFF007AFF)
    }
}
