package com.creapolis.solennix.core.designsystem.component

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private const val ACTION_BUTTON_WIDTH_DP = 52

/**
 * iOS-style swipe-to-reveal action icons.
 *
 * Swiping left reveals Edit and Delete icon buttons behind the content.
 * The action area matches the height of the content intrinsically.
 */
@Composable
fun SwipeRevealActions(
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
    showEdit: Boolean = true,
    content: @Composable () -> Unit
) {
    val density = LocalDensity.current
    val buttonCount = if (showEdit) 2 else 1
    val maxOffsetPx = with(density) { (ACTION_BUTTON_WIDTH_DP * buttonCount).dp.toPx() }
    val scope = rememberCoroutineScope()
    val offsetX = remember { Animatable(0f) }

    val draggableState = rememberDraggableState { delta ->
        scope.launch {
            val newValue = (offsetX.value + delta).coerceIn(-maxOffsetPx, 0f)
            offsetX.snapTo(newValue)
        }
    }

    Box(
        modifier = modifier
            .height(IntrinsicSize.Min)
            .clipToBounds()
    ) {
        // Action icons (behind content, aligned to end)
        Row(
            modifier = Modifier
                .fillMaxHeight()
                .align(Alignment.CenterEnd)
                .padding(end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.End
        ) {
            if (showEdit) {
                Box(
                    modifier = Modifier
                        .width(ACTION_BUTTON_WIDTH_DP.dp)
                        .fillMaxHeight()
                        .clickable {
                            scope.launch { offsetX.animateTo(0f, spring(stiffness = Spring.StiffnessMedium)) }
                            onEdit()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Edit,
                        contentDescription = "Editar",
                        tint = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
            Box(
                modifier = Modifier
                    .width(ACTION_BUTTON_WIDTH_DP.dp)
                    .fillMaxHeight()
                    .clickable {
                        scope.launch { offsetX.animateTo(0f, spring(stiffness = Spring.StiffnessMedium)) }
                        onDelete()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Delete,
                    contentDescription = "Eliminar",
                    tint = SolennixTheme.colors.error,
                    modifier = Modifier.size(22.dp)
                )
            }
        }

        // Foreground content
        Box(
            modifier = Modifier
                .offset { IntOffset(offsetX.value.roundToInt(), 0) }
                .draggable(
                    state = draggableState,
                    orientation = Orientation.Horizontal,
                    onDragStopped = {
                        scope.launch {
                            val target = if (offsetX.value < -maxOffsetPx * 0.35f) -maxOffsetPx else 0f
                            offsetX.animateTo(
                                target,
                                spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessMedium
                                )
                            )
                        }
                    }
                )
        ) {
            content()
        }
    }
}
