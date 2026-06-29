package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.Velocity
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import kotlinx.coroutines.launch

/**
 * A swipeable container that wraps a checklist item card with swipe-to-complete functionality.
 *
 * Usage:
 * ```
 * SwipeToCompleteBox(
 *     isCompleted = item.isCompleted,
 *     onComplete = { viewModel.toggleChecklistItem(item, true) },
 *     onIncomplete = { viewModel.toggleChecklistItem(item, false) }
 * ) {
 *     ChecklistItemCard(
 *         item = item,
 *         onToggle = { viewModel.toggleChecklistItem(item) }
 *     )
 * }
 * ```
 *
 * @param isCompleted Whether the item is currently in completed state
 * @param onComplete Callback when swipe completes towards the right
 * @param onIncomplete Callback when swipe completes towards the left
 * @param modifier Modifier for the container
 * @param content The checklist item card content
 */
@Composable
fun SwipeToCompleteBox(
    isCompleted: Boolean,
    onComplete: () -> Unit,
    onIncomplete: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var swipeOffset by remember { mutableFloatStateOf(0f) }

    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPostScroll(
                consumed: Offset,
                available: Offset,
                source: NestedScrollSource
            ): Offset {
                swipeOffset += available.x
                return Offset.Zero
            }

            override suspend fun onPostFling(
                consumed: Velocity,
                available: Velocity
            ): Velocity {
                val threshold = 100f
                if (swipeOffset > threshold) {
                    if (!isCompleted) onComplete()
                    coroutineScope.launch {
                        swipeOffset = 0f
                    }
                } else if (swipeOffset < -threshold) {
                    if (isCompleted) onIncomplete()
                    coroutineScope.launch {
                        swipeOffset = 0f
                    }
                } else {
                    coroutineScope.launch {
                        swipeOffset = 0f
                    }
                }
                return Velocity.Zero
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .nestedScroll(nestedScrollConnection)
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = SolennixTheme.colors.card
            ),
            shape = MaterialTheme.shapes.medium
        ) {
            content()
        }
    }
}
