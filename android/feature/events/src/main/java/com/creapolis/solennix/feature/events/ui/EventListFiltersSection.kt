package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Badge
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventStatusFilter
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun EventListFiltersSection(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    startDate: LocalDate?,
    endDate: LocalDate?,
    onDateRangeChange: (LocalDate?, LocalDate?) -> Unit,
    selectedStatus: EventStatus?,
    statusFilters: List<EventStatusFilter>,
    onStatusFilterChange: (EventStatus) -> Unit,
    onClearFilters: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchQueryChange,
            modifier = Modifier.weight(1f),
            placeholder = { Text(stringResource(R.string.events_list_search_placeholder)) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onSearchQueryChange("") }) {
                        Icon(Icons.Default.Clear, contentDescription = stringResource(R.string.events_list_clear_search))
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = SolennixTheme.colors.primary,
                unfocusedBorderColor = SolennixTheme.colors.divider
            )
        )

        Spacer(modifier = Modifier.width(8.dp))

        var showDateRangePicker by remember { mutableStateOf(false) }

        IconButton(
            onClick = { showDateRangePicker = true },
            colors = IconButtonDefaults.iconButtonColors(
                containerColor = if (startDate != null) SolennixTheme.colors.primaryLight else Color.Transparent
            )
        ) {
            Icon(
                Icons.Default.DateRange,
                contentDescription = stringResource(R.string.events_list_date_range),
                tint = if (startDate != null) SolennixTheme.colors.primary else SolennixTheme.colors.secondaryText
            )
        }

        if (showDateRangePicker) {
            val dateRangePickerState = rememberDateRangePickerState()
            DatePickerDialog(
                onDismissRequest = { showDateRangePicker = false },
                confirmButton = {
                    TextButton(onClick = {
                        val start = dateRangePickerState.selectedStartDateMillis?.let {
                            java.time.Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).toLocalDate()
                        }
                        val end = dateRangePickerState.selectedEndDateMillis?.let {
                            java.time.Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).toLocalDate()
                        }
                        onDateRangeChange(start, end)
                        showDateRangePicker = false
                    }) { Text(stringResource(R.string.events_list_apply)) }
                },
                dismissButton = {
                    TextButton(onClick = { showDateRangePicker = false }) { Text(stringResource(R.string.events_list_cancel)) }
                }
            ) {
                DateRangePicker(
                    state = dateRangePickerState,
                    modifier = Modifier.height(400.dp),
                    title = { Text(stringResource(R.string.events_list_select_range)) },
                    headline = { Text(stringResource(R.string.events_list_date_filter_headline)) },
                    showModeToggle = false,
                    colors = DatePickerDefaults.colors(
                        selectedDayContainerColor = SolennixTheme.colors.primary,
                        todayContentColor = SolennixTheme.colors.primary,
                        todayDateBorderColor = SolennixTheme.colors.primary
                    )
                )
            }
        }
    }

    if (startDate != null || selectedStatus != null) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (startDate != null) {
                val formatter = DateTimeFormatter.ofPattern("dd/MM", Locale.getDefault())
                val label = "${startDate.format(formatter)} - ${endDate?.format(formatter) ?: "…"}"
                FilterChip(
                    selected = true,
                    onClick = { onDateRangeChange(null, null) },
                    label = { Text(label) },
                    trailingIcon = { Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp)) }
                )
            }

            TextButton(onClick = onClearFilters) {
                Text(stringResource(R.string.events_list_clear_all), style = MaterialTheme.typography.labelSmall)
            }
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        statusFilters.forEach { filter ->
            val isSelected = filter.status == selectedStatus
            FilterChip(
                selected = isSelected,
                onClick = { onStatusFilterChange(filter.status) },
                label = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(filter.label)
                        if (filter.count > 0) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Badge(
                                containerColor = if (isSelected) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    SolennixTheme.colors.secondaryText.copy(alpha = 0.3f)
                                }
                            ) {
                                Text(
                                    filter.count.toString(),
                                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary else SolennixTheme.colors.primaryText
                                )
                            }
                        }
                    }
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = SolennixTheme.colors.primaryLight,
                    selectedLabelColor = SolennixTheme.colors.primary
                )
            )
        }
    }
}