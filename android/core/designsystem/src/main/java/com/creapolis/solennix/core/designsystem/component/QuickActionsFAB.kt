package com.creapolis.solennix.core.designsystem.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixElevation
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

@Composable
fun QuickActionsFAB(
    onNewEventClick: () -> Unit,
    onQuickQuoteClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    val rotation by animateFloatAsState(
        targetValue = if (expanded) 45f else 0f,
        label = "fab_rotation"
    )

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AnimatedVisibility(
            visible = expanded,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { it })
        ) {
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Quick Quote option
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = SolennixTheme.colors.card,
                        shadowElevation = 2.dp
                    ) {
                        Text(
                            stringResource(R.string.quick_actions_quote),
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            style = MaterialTheme.typography.labelMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                    }
                    SmallFloatingActionButton(
                        onClick = {
                            expanded = false
                            onQuickQuoteClick()
                        },
                        containerColor = SolennixTheme.colors.primary,
                        contentColor = Color.White
                    ) {
                        Icon(Icons.Default.Bolt, contentDescription = stringResource(R.string.quick_actions_quote))
                    }
                }

                // New Event option
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = SolennixTheme.colors.card,
                        shadowElevation = 2.dp
                    ) {
                        Text(
                            stringResource(R.string.quick_actions_new_event),
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            style = MaterialTheme.typography.labelMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                    }
                    SmallFloatingActionButton(
                        onClick = {
                            expanded = false
                            onNewEventClick()
                        },
                        containerColor = SolennixTheme.colors.primary,
                        contentColor = Color.White
                    ) {
                        Icon(Icons.Default.Celebration, contentDescription = null)
                    }
                }
            }
        }

        // Main FAB — rotates 45° when expanded (+ becomes ×)
        FloatingActionButton(
            onClick = { expanded = !expanded },
            containerColor = SolennixTheme.colors.primary,
            elevation = FloatingActionButtonDefaults.elevation(
                defaultElevation = SolennixElevation.fab
            )
        ) {
            Icon(
                Icons.Default.Add,
                contentDescription = if (expanded) stringResource(R.string.quick_actions_close) else stringResource(R.string.quick_actions_open),
                tint = Color.White,
                modifier = Modifier.rotate(rotation)
            )
        }
    }
}
