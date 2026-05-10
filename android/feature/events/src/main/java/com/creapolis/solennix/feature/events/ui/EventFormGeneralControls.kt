package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.events.R

@Composable
fun GuestCountStepper(
    value: Int,
    onValueChange: (Int) -> Unit,
) {
    Column {
        Text(
            stringResource(R.string.events_form_general_people),
            style = MaterialTheme.typography.labelMedium,
            color = SolennixTheme.colors.secondaryText,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Surface(
            shape = MaterialTheme.shapes.small,
            border = BorderStroke(1.dp, SolennixTheme.colors.borderLight),
            color = androidx.compose.ui.graphics.Color.Transparent,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
            ) {
                IconButton(
                    onClick = { if (value > 0) onValueChange(value - 1) },
                    enabled = value > 0,
                ) {
                    Icon(
                        Icons.Default.RemoveCircle,
                        contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                        tint = if (value > 0) SolennixTheme.colors.primary else SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(28.dp),
                    )
                }
                EditableQuantityField(
                    value = value,
                    onValueChange = onValueChange,
                    minValue = 0,
                    key = "guestCount",
                    modifier = Modifier.weight(1f),
                    width = 80.dp,
                    textStyle = LocalTextStyle.current.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = MaterialTheme.typography.titleMedium.fontSize,
                        color = if (value == 0) SolennixTheme.colors.secondaryText else SolennixTheme.colors.primaryText,
                    ),
                )
                IconButton(onClick = { onValueChange(value + 1) }) {
                    Icon(
                        Icons.Default.AddCircle,
                        contentDescription = stringResource(R.string.events_form_products_increase_a11y),
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(28.dp),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimePickerField(
    label: String,
    value: String,
    onClick: () -> Unit,
) {
    val isBlank = value.isBlank()
    val displayValue = if (isBlank) stringResource(R.string.events_form_general_optional) else value
    OutlinedTextField(
        value = displayValue,
        onValueChange = {},
        label = { Text(label) },
        readOnly = true,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        trailingIcon = {
            IconButton(onClick = onClick) {
                Icon(Icons.Default.Schedule, contentDescription = label)
            }
        },
        shape = RoundedCornerShape(12.dp),
        enabled = false,
        colors = OutlinedTextFieldDefaults.colors(
            disabledTextColor = if (isBlank) SolennixTheme.colors.secondaryText else SolennixTheme.colors.primaryText,
            disabledBorderColor = SolennixTheme.colors.borderLight,
            disabledLabelColor = SolennixTheme.colors.secondaryText,
            disabledTrailingIconColor = SolennixTheme.colors.primary,
            disabledContainerColor = SolennixTheme.colors.card,
        ),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimePickerDialogM3(
    initialTime: java.time.LocalTime?,
    onDismiss: () -> Unit,
    onConfirm: (Int, Int) -> Unit,
) {
    val state = rememberTimePickerState(
        initialHour = initialTime?.hour ?: 18,
        initialMinute = initialTime?.minute ?: 0,
        is24Hour = true,
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.events_form_general_time_picker_title)) },
        text = { TimePicker(state = state) },
        confirmButton = {
            TextButton(onClick = { onConfirm(state.hour, state.minute) }) {
                Text(stringResource(R.string.events_form_general_time_picker_confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.events_form_cancel))
            }
        },
    )
}