package com.creapolis.solennix.feature.settings.ui

import com.creapolis.solennix.feature.settings.R
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.viewmodel.ContractDefaultsViewModel
import com.creapolis.solennix.feature.settings.viewmodel.DEFAULT_CONTRACT_TEMPLATE
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
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.settings_contract_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(DesignSystemR.string.cd_back))
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
                    text = stringResource(R.string.settings_contract_deposit),
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
                                text = stringResource(R.string.settings_contract_deposit_percent),
                                style = MaterialTheme.typography.bodyLarge,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                text = stringResource(R.string.settings_contract_deposit_percent_value, viewModel.depositPercent.roundToInt()),
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
                    text = stringResource(R.string.settings_contract_deposit_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Cancellation Section
                Text(
                    text = stringResource(R.string.settings_contract_cancellation),
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
                                text = stringResource(R.string.settings_contract_cancellation_days),
                                style = MaterialTheme.typography.bodyLarge,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                text = stringResource(R.string.settings_contract_days_value, viewModel.cancellationDays.roundToInt()),
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
                    text = stringResource(R.string.settings_contract_cancellation_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Refund Section
                Text(
                    text = stringResource(R.string.settings_contract_refund),
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
                                text = stringResource(R.string.settings_contract_refund_percent),
                                style = MaterialTheme.typography.bodyLarge,
                                color = SolennixTheme.colors.primaryText
                            )
                            Text(
                                text = stringResource(R.string.settings_contract_deposit_percent_value, viewModel.refundPercent.roundToInt()),
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
                    text = stringResource(R.string.settings_contract_refund_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Contract Template Section
                Text(
                    text = stringResource(R.string.settings_contract_template),
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
                            label = { Text(stringResource(R.string.settings_contract_template_field)) },
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
                            text = stringResource(R.string.settings_contract_tokens_title),
                            style = MaterialTheme.typography.labelMedium,
                            color = SolennixTheme.colors.secondaryText,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        val tokens = listOf(
                            "[Nombre del proveedor]" to "Proveedor",
                            "[Nombre comercial del proveedor]" to "Nombre comercial",
                            "[Email del proveedor]" to "Email proveedor",
                            "[Fecha actual]" to "Fecha actual",
                            "[Fecha del evento]" to "Fecha evento",
                            "[Hora de inicio]" to "Hora inicio",
                            "[Hora de fin]" to "Hora fin",
                            "[Horario del evento]" to "Horario",
                            "[Tipo de servicio]" to "Tipo servicio",
                            "[Número de personas]" to "Personas",
                            "[Lugar del evento]" to "Lugar",
                            "[Ciudad del evento]" to "Ciudad evento",
                            "[Servicios del evento]" to "Servicios",
                            "[Monto total del evento]" to "Total",
                            "[Porcentaje de anticipo]" to "% anticipo",
                            "[Porcentaje de reembolso]" to "% reembolso",
                            "[Días de cancelación]" to "Días cancelación",
                            "[Total pagado]" to "Total pagado",
                            "[Nombre del cliente]" to "Cliente",
                            "[Teléfono del cliente]" to "Tel. cliente",
                            "[Email del cliente]" to "Email cliente",
                            "[Dirección del cliente]" to "Dir. cliente",
                            "[Ciudad del cliente]" to "Ciudad cliente",
                            "[Ciudad del contrato]" to "Ciudad contrato",
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
                        Spacer(modifier = Modifier.height(8.dp))

                        TextButton(
                            onClick = {
                                textFieldValue = TextFieldValue(DEFAULT_CONTRACT_TEMPLATE)
                                viewModel.contractTemplate = DEFAULT_CONTRACT_TEMPLATE
                            },
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = SolennixTheme.colors.primary
                            )
                        ) {
                            Text(
                                text = stringResource(R.string.settings_contract_restore_default),
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = stringResource(R.string.settings_contract_template_hint),
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
                    Text(stringResource(R.string.settings_contract_preview))
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
                    text = stringResource(R.string.settings_contract_preview_terms),
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
                            shape = MaterialTheme.shapes.medium,
                            color = SolennixTheme.colors.surfaceGrouped
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                PreviewRow(
                                    label = stringResource(R.string.settings_contract_preview_deposit_required),
                                    value = stringResource(R.string.settings_contract_preview_deposit_required_value, viewModel.depositPercent.roundToInt())
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                PreviewRow(
                                    label = stringResource(R.string.settings_contract_preview_cancellation),
                                    value = stringResource(R.string.settings_contract_preview_cancellation_value, viewModel.cancellationDays.roundToInt())
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                PreviewRow(
                                    label = stringResource(R.string.settings_contract_preview_refund),
                                    value = stringResource(R.string.settings_contract_preview_refund_value, viewModel.refundPercent.roundToInt())
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
                    text = stringResource(R.string.common_save),
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
        "[Nombre del proveedor]" to "Juan Pérez",
        "[Nombre comercial del proveedor]" to "Eventos Brillantes",
        "[Email del proveedor]" to "juan@eventosbrillantes.com",
        "[Fecha actual]" to "15 de abril de 2026",
        "[Fecha del evento]" to "15 de junio de 2026",
        "[Hora de inicio]" to "18:00",
        "[Hora de fin]" to "23:00",
        "[Horario del evento]" to "18:00 - 23:00",
        "[Tipo de servicio]" to "Boda",
        "[Número de personas]" to "150",
        "[Lugar del evento]" to "Salón Royal, Guadalajara",
        "[Ciudad del evento]" to "Guadalajara",
        "[Servicios del evento]" to "1 Fotografía, 1 Video",
        "[Monto total del evento]" to "$25,000.00",
        "[Porcentaje de anticipo]" to "50",
        "[Porcentaje de reembolso]" to "50",
        "[Días de cancelación]" to "7",
        "[Total pagado]" to "$12,500.00",
        "[Nombre del cliente]" to "María García López",
        "[Teléfono del cliente]" to "+52 33 1234 5678",
        "[Email del cliente]" to "maria@gmail.com",
        "[Dirección del cliente]" to "Av. Reforma 123",
        "[Ciudad del cliente]" to "Guadalajara",
        "[Ciudad del contrato]" to "Guadalajara",
    )

    var renderedText = template
    sampleData.forEach { (token, value) ->
        renderedText = renderedText.replace(token, value)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.settings_contract_preview_dialog_title),
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )
        },
        text = {
            Column {
                if (template.isBlank()) {
                    Text(
                        text = stringResource(R.string.settings_contract_preview_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                } else {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = MaterialTheme.shapes.medium,
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
                        text = stringResource(R.string.settings_contract_preview_sample_data),
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
                    stringResource(R.string.common_close),
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
