package com.creapolis.solennix.feature.settings.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventReview
import com.creapolis.solennix.core.model.ReviewVisibility
import com.creapolis.solennix.feature.settings.R
import com.creapolis.solennix.feature.settings.viewmodel.ReviewsUiState
import com.creapolis.solennix.feature.settings.viewmodel.ReviewsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewsScreen(
    viewModel: ReviewsViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val errorMessage = stringResource(R.string.reviews_error_loading)

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.reviews_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        AnimatedContent(
            targetState = when {
                uiState.error != null && uiState.reviews.isEmpty() && !uiState.isLoading -> "error"
                uiState.isLoading && uiState.reviews.isEmpty() -> "loading"
                uiState.reviews.isEmpty() && !uiState.isLoading -> "empty"
                else -> "content"
            },
            transitionSpec = { fadeIn().togetherWith(fadeOut()) },
            label = "reviews_state",
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) { state ->
            when (state) {
                "error" -> EmptyState(
                    icon = Icons.Default.WifiOff,
                    title = stringResource(R.string.reviews_empty_title),
                    message = uiState.error ?: errorMessage,
                    actionText = stringResource(R.string.reviews_retry),
                    onAction = { viewModel.loadReviews() }
                )
                "loading" -> ReviewsSkeleton(count = 4)
                "empty" -> EmptyState(
                    icon = Icons.Default.StarOutline,
                    title = stringResource(R.string.reviews_empty_title),
                    message = stringResource(R.string.reviews_empty_hint)
                )
                "content" -> ReviewsList(
                    uiState = uiState,
                    onSaveResponse = { id, text -> viewModel.saveResponse(id, text) },
                    onUpdateVisibility = { id, vis -> viewModel.updateVisibility(id, vis) }
                )
            }
        }
    }
}

@Composable
private fun ReviewsList(
    uiState: ReviewsUiState,
    onSaveResponse: (String, String) -> Unit,
    onUpdateVisibility: (String, ReviewVisibility) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp
        )
    ) {
        items(uiState.reviews, key = { it.id }) { review ->
            ReviewCard(
                review = review,
                isSavingResponse = uiState.savingResponseId == review.id,
                isUpdatingVisibility = uiState.updatingVisibilityId == review.id,
                onSaveResponse = onSaveResponse,
                onUpdateVisibility = onUpdateVisibility
            )
        }
    }
}

@Composable
private fun ReviewCard(
    review: EventReview,
    isSavingResponse: Boolean,
    isUpdatingVisibility: Boolean,
    onSaveResponse: (String, String) -> Unit,
    onUpdateVisibility: (String, ReviewVisibility) -> Unit
) {
    var responseDraft by rememberSaveable(review.id, review.organizerResponse) {
        mutableStateOf(review.organizerResponse ?: "")
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header: client/event + stars
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = review.clientName ?: stringResource(R.string.reviews_unknown_client),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = review.eventLabel ?: stringResource(R.string.reviews_unknown_event),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                // Stars
                Row(verticalAlignment = Alignment.CenterVertically) {
                    repeat(5) { i ->
                        Icon(
                            imageVector = if (i < review.rating) Icons.Default.Star else Icons.Default.StarOutline,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = SolennixTheme.colors.primary
                        )
                    }
                }
            }

            // Comment
            val comment = review.comment
            if (!comment.isNullOrBlank()) {
                Text(
                    text = comment,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.primaryText
                )
            }

            HorizontalDivider(color = SolennixTheme.colors.divider.copy(alpha = 0.5f))

            // Visibility toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                VisibilityChip(
                    label = stringResource(R.string.reviews_visibility_private),
                    selected = review.visibility == ReviewVisibility.PRIVATE,
                    enabled = !isUpdatingVisibility,
                    onClick = { onUpdateVisibility(review.id, ReviewVisibility.PRIVATE) },
                    modifier = Modifier.weight(1f)
                )
                VisibilityChip(
                    label = stringResource(R.string.reviews_visibility_public),
                    selected = review.visibility == ReviewVisibility.PUBLIC,
                    enabled = !isUpdatingVisibility,
                    onClick = { onUpdateVisibility(review.id, ReviewVisibility.PUBLIC) },
                    modifier = Modifier.weight(1f)
                )
            }

            // Response field
            OutlinedTextField(
                value = responseDraft,
                onValueChange = { responseDraft = it },
                label = { Text(stringResource(R.string.reviews_response_placeholder)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 5,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences)
            )

            // Save button
            Button(
                onClick = { onSaveResponse(review.id, responseDraft.trim()) },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSavingResponse,
                colors = ButtonDefaults.buttonColors(
                    containerColor = SolennixTheme.colors.primary,
                    disabledContainerColor = SolennixTheme.colors.primary.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isSavingResponse) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = stringResource(R.string.reviews_save_response),
                        color = SolennixTheme.colors.inverseText
                    )
                }
            }
        }
    }
}

@Composable
private fun VisibilityChip(
    label: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TextButton(
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        shape = RoundedCornerShape(50),
        colors = if (selected) {
            ButtonDefaults.textButtonColors(
                containerColor = SolennixTheme.colors.primary,
                contentColor = SolennixTheme.colors.inverseText
            )
        } else {
            ButtonDefaults.textButtonColors(
                containerColor = SolennixTheme.colors.surfaceAlt,
                contentColor = SolennixTheme.colors.secondaryText
            )
        }
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun ReviewsSkeleton(count: Int) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp
        )
    ) {
        items(count) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Header row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            SkeletonLoading(
                                modifier = Modifier
                                    .width(140.dp)
                                    .height(14.dp)
                                    .clip(RoundedCornerShape(4.dp))
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            SkeletonLoading(
                                modifier = Modifier
                                    .width(100.dp)
                                    .height(10.dp)
                                    .clip(RoundedCornerShape(4.dp))
                            )
                        }
                        SkeletonLoading(
                            modifier = Modifier
                                .width(90.dp)
                                .height(16.dp)
                                .clip(RoundedCornerShape(4.dp))
                        )
                    }
                    // Comment lines
                    SkeletonLoading(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(4.dp))
                    )
                    SkeletonLoading(
                        modifier = Modifier
                            .fillMaxWidth(0.7f)
                            .height(10.dp)
                            .clip(RoundedCornerShape(4.dp))
                    )
                }
            }
        }
    }
}
