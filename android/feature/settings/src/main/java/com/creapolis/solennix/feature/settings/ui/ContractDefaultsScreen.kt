package com.creapolis.solennix.feature.settings.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Preview
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.viewmodel.ContractDefaultsViewModel
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContractDefaultsScreen(
    viewModel: ContractDefaultsViewModel,
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
                title = { Text("Valores del Contrato") },
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
                // Deposit Section
                Text(
                    text = "Anticipo",
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
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Porcentaje de anticipo",
                                style = MaterialTheme.typography.bodyLarge,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                text = "${viewModel.depositPercent.roundToInt()}%",
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Slider(
                            value = viewModel.depositPercent,
                            onValueChange = { viewModel.depositPercent = it },
                            valueRange = 0f..100f,
                            steps = 19,
                            colors = SliderDefaults.colors(
                                thumbColor = SolennixTheme.colors.primary,
                                activeTrackColor = SolennixTheme.colors.primary
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Porcentaje del total que solicitas como anticipo al confirmar un evento.",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Cancellation Section
                Text(
                    text = "Cancelacion",
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
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Dias de anticipacion",
                                style = MaterialTheme.typography.bodyLarge,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                text = "${viewModel.cancellationDays.roundToInt()} dias",
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Slider(
                            value = viewModel.cancellationDays,
                            onValueChange = { viewModel.cancellationDays = it },
                            valueRange = 1f..30f,
                            steps = 28,
                            colors = SliderDefaults.colors(
                                thumbColor = SolennixTheme.colors.primary,
                                activeTrackColor = SolennixTheme.colors.primary
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Numero minimo de dias antes del evento para permitir cancelacion con reembolso.",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Refund Section
                Text(
                    text = "Reembolso",
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
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Porcentaje de reembolso",
                                style = MaterialTheme.typography.bodyLarge,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                text = "${viewModel.refundPercent.roundToInt()}%",
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Slider(
                            value = viewModel.refundPercent,
                            onValueChange = { viewModel.refundPercent = it },
                            valueRange = 0f..100f,
                            steps = 19,
                            colors = SliderDefaults.colors(
                                thumbColor = SolennixTheme.colors.primary,
                                activeTrackColor = SolennixTheme.colors.primary
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Porcentaje del anticipo que devuelves en caso de cancelacion dentro del plazo permitido.",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Contract Template Section
                Text(
                    text = "Plantilla de Contrato",
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
                        var textFieldValue by remember(viewModel.contractTemplate) {
                            mutableStateOf(TextFieldValue(viewModel.contractTemplate))
                        }

                        OutlinedTextField(
                            value = textFieldValue,
                            onValueChange = {
                                textFieldValue = it
                                viewModel.contractTemplate = it.text
                            },
                            label = { Text("Texto de la plantilla del contrato") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 150.dp),
                            maxLines = 15,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = SolennixTheme.colors.primary,
                                cursorColor = SolennixTheme.colors.primary
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "Tokens disponibles (toca para insertar):",
                            style = MaterialTheme.typography.labelMedium,
                            color = SolennixTheme.colors.secondaryText,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        val tokens = listOf(
                            "{nombre_cliente}" to "Cliente",
                            "{fecha_evento}" to "Fecha",
                            "{lugar}" to "Lugar",
                            "{total}" to "Total",
                            "{anticipo}" to "Anticipo",
                            "{tipo_evento}" to "Tipo",
                            "{num_personas}" to "Personas",
                            "{nombre_negocio}" to "Negocio"
                        )

                        val chipScrollState = rememberScrollState()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(chipScrollState),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            tokens.forEach { (token, chipLabel) ->
                                AssistChip(
                                    onClick = {
                                        val cursorPos = textFieldValue.selection.start
                                        val currentText = textFieldValue.text
                                        val newText = currentText.substring(0, cursorPos) +
                                            token +
                                            currentText.substring(cursorPos)
                                        val newCursorPos = cursorPos + token.length
                                        textFieldValue = TextFieldValue(
                                            text = newText,
                                            selection = TextRange(newCursorPos)
                                        )
                                        viewModel.contractTemplate = newText
                                    },
                                    label = {
                                        Text(
                                            text = chipLabel,
                                            style = MaterialTheme.typography.labelSmall
                                        )
                                    },
                                    colors = AssistChipDefaults.assistChipColors(
                                        containerColor = SolennixTheme.colors.primary.copy(alpha = 0.1f),
                                        labelColor = SolennixTheme.colors.primary
                                    ),
                                    border = BorderStroke(1.dp, SolennixTheme.colors.primary.copy(alpha = 0.3f))
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Personaliza el texto de tus contratos. Usa los tokens para insertar datos del evento automaticamente.",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Preview Button
                var showPreviewDialog by remember { mutableStateOf(false) }

                OutlinedButton(
                    onClick = { showPreviewDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = SolennixTheme.colors.primary
                    ),
                    border = ButtonDefaults.outlinedButtonBorder(
                        enabled = true
                    )
                ) {
                    Icon(
                        Icons.Default.Preview,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Vista Previa")
                }

                if (showPreviewDialog) {
                    ContractTemplatePreviewDialog(
                        template = viewModel.contractTemplate,
                        onDismiss = { showPreviewDialog = false }
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Terms Preview Section
                Text(
                    text = "Vista Previa de Terminos",
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
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            color = SolennixTheme.colors.surfaceGrouped
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                PreviewRow(
                                    label = "Anticipo requerido",
                                    value = "${viewModel.depositPercent.roundToInt()}% del total"
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                PreviewRow(
                                    label = "Cancelacion sin penalizacion",
                                    value = "${viewModel.cancellationDays.roundToInt()} dias antes"
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                PreviewRow(
                                    label = "Reembolso por cancelacion",
                                    value = "${viewModel.refundPercent.roundToInt()}% del anticipo"
                                )
                            }
                        }
                    }
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
                    onClick = { viewModel.saveContractDefaults() },
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
private fun ContractTemplatePreviewDialog(
    template: String,
    onDismiss: () -> Unit
) {
    val sampleData = mapOf(
        "{nombre_cliente}" to "Maria Garcia Lopez",
        "{fecha_evento}" to "15 de junio de 2026",
        "{lugar}" to "Salon Royal, Guadalajara",
        "{total}" to "$25,000.00",
        "{anticipo}" to "$12,500.00",
        "{tipo_evento}" to "Boda",
        "{num_personas}" to "150",
        "{nombre_negocio}" to "Eventos Brillantes"
    )

    var renderedText = template
    sampleData.forEach { (token, value) ->
        renderedText = renderedText.replace(token, value)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Vista Previa del Contrato",
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )
        },
        text = {
            Column {
                if (template.isBlank()) {
                    Text(
                        text = "La plantilla esta vacia. Escribe el texto del contrato y usa los tokens para insertar datos automaticamente.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                } else {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        color = SolennixTheme.colors.surfaceGrouped
                    ) {
                        Text(
                            text = renderedText,
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.primaryText,
                            modifier = Modifier.padding(12.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Datos de ejemplo utilizados:",
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )

                    sampleData.forEach { (token, value) ->
                        if (template.contains(token)) {
                            Text(
                                text = "$token → $value",
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(
                    "Cerrar",
                    color = SolennixTheme.colors.primary
                )
            }
        },
        containerColor = SolennixTheme.colors.card
    )
}

@Composable
private fun PreviewRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = SolennixTheme.colors.secondaryText
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            color = SolennixTheme.colors.primaryText
        )
    }
}
