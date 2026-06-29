package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.Spacing
import com.creapolis.solennix.core.designsystem.R
import com.creapolis.solennix.core.designsystem.util.adaptiveSheetPadding
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentModal(
    remaining: Double,
    initialAmount: Double? = null,
    title: String? = null,
    confirmLabel: String? = null,
    onDismiss: () -> Unit,
    onConfirm: (Double, String, String, String) -> Unit
) {
    val modalTitle = title ?: stringResource(R.string.payment_modal_title)
    val modalConfirmLabel = confirmLabel ?: stringResource(R.string.payment_modal_confirm)
    val prefillAmount = initialAmount ?: if (remaining > 0) remaining else null
    var amount by remember { mutableStateOf(prefillAmount?.toString() ?: "") }
    var method by remember { mutableStateOf("cash") }
    var notes by remember { mutableStateOf("") }
    var paymentDate by remember { mutableStateOf(LocalDate.now().toString()) }
    var showDatePicker by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = System.currentTimeMillis()
    )

    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val instant = Instant.ofEpochMilli(millis)
                        paymentDate = instant.atZone(ZoneOffset.UTC).toLocalDate().toString()
                    }
                    showDatePicker = false
                }) {
                    Text(stringResource(R.string.common_accept))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .padding(adaptiveSheetPadding())
                .fillMaxWidth()
        ) {
            Text(modalTitle, style = MaterialTheme.typography.titleLarge)
            Spacer(modifier = Modifier.height(Spacing.md))

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text(stringResource(R.string.payment_modal_amount)) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(Spacing.md))

            OutlinedTextField(
                value = paymentDate,
                onValueChange = {},
                label = { Text(stringResource(R.string.payment_modal_date)) },
                readOnly = true,
                trailingIcon = {
                    IconButton(onClick = { showDatePicker = true }) {
                        Icon(Icons.Default.CalendarToday, contentDescription = stringResource(R.string.payment_modal_select_date_a11y))
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showDatePicker = true }
            )
            Spacer(modifier = Modifier.height(Spacing.md))

            Text(stringResource(R.string.payment_modal_method), style = MaterialTheme.typography.labelMedium)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                listOf(
                    "cash" to stringResource(R.string.payment_method_cash),
                    "transfer" to stringResource(R.string.payment_method_transfer),
                    "card" to stringResource(R.string.payment_method_card)
                ).forEach { (key, label) ->
                    FilterChip(
                        selected = method == key,
                        onClick = { method = key },
                        label = { Text(label) }
                    )
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                listOf(
                    "check" to stringResource(R.string.payment_method_check),
                    "other" to stringResource(R.string.payment_method_other)
                ).forEach { (key, label) ->
                    FilterChip(
                        selected = method == key,
                        onClick = { method = key },
                        label = { Text(label) }
                    )
                }
            }

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text(stringResource(R.string.payment_modal_notes_optional)) },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(Spacing.xl))

            PremiumButton(
                text = modalConfirmLabel,
                onClick = {
                    val amt = amount.replace(",", ".").toDoubleOrNull()
                    if (amt != null && amt > 0) {
                        onConfirm(amt, method, notes, paymentDate)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(Spacing.xxl))
        }
    }
}
