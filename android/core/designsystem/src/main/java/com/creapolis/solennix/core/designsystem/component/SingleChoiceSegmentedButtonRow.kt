package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SingleChoiceSegmentedButtonRowScope
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Material 3 SegmentedButton row for single-choice selection.
 * Use this component for view toggles, filter switches, and other mutually exclusive options.
 *
 * @param options List of option labels to display as segments
 * @param selectedIndex Index of the currently selected option (0-based)
 * @param onOptionSelected Callback when a segment is tapped, receives the selected index
 * @param modifier Optional modifier for the row
 *
 * Example usage:
 * ```kotlin
 * var selected by remember { mutableStateOf(0) }
 * SingleChoiceSegmentedButtonRow(
 *     options = listOf("Lista", "Calendario"),
 *     selectedIndex = selected,
 *     onOptionSelected = { selected = it }
 * )
 * ```
 */
@Composable
fun SingleChoiceSegmentedButtonRow(
    options: List<String>,
    selectedIndex: Int,
    onOptionSelected: (index: Int) -> Unit,
    modifier: Modifier = Modifier
) {
    require(selectedIndex in options.indices) {
        "selectedIndex $selectedIndex is out of bounds for options list of size ${options.size}"
    }

    androidx.compose.material3.SingleChoiceSegmentedButtonRow(
        modifier = modifier.padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        options.forEachIndexed { index, option ->
            SegmentedButton(
                selected = index == selectedIndex,
                onClick = { onOptionSelected(index) },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = options.size
                ),
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    activeContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    inactiveContainerColor = MaterialTheme.colorScheme.surface,
                    inactiveContentColor = MaterialTheme.colorScheme.onSurface
                )
            ) {
                Text(option)
            }
        }
    }
}
