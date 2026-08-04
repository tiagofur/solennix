package com.creapolis.solennix.feature.requests.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixPullToRefreshBox
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.PublicRequest
import com.creapolis.solennix.feature.requests.R
import com.creapolis.solennix.feature.requests.viewmodel.RequestsInboxViewModel
import com.creapolis.solennix.feature.requests.viewmodel.RequestsStatusFilter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestsInboxScreen(
    viewModel: RequestsInboxViewModel,
    onNavigateBack: () -> Unit,
    onOpenDetail: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val retryLabel = stringResource(R.string.requests_inbox_error_retry)

    LaunchedEffect(uiState.error) {
        val err = uiState.error
        if (err != null && uiState.items.isEmpty() && !uiState.isLoading) {
            snackbarHostState.showSnackbar(err, actionLabel = retryLabel)
        }
    }
    LaunchedEffect(uiState.actionSuccess) {
        uiState.actionSuccess?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearActionMessages()
        }
    }
    LaunchedEffect(uiState.actionError) {
        uiState.actionError?.let {
            snackbarHostState.showSnackbar(it, actionLabel = retryLabel)
            viewModel.clearActionMessages()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = {
                    val base = stringResource(R.string.requests_inbox_title)
                    val title = if (uiState.unreadCount > 0) {
                        "$base (${uiState.unreadCount})"
                    } else {
                        base
                    }
                    Text(title)
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = stringResource(R.string.requests_inbox_back)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        SolennixPullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                FilterRow(
                    selected = uiState.statusFilter,
                    onSelect = viewModel::applyFilter
                )

                val phase = when {
                    uiState.isLoading && uiState.items.isEmpty() -> "loading"
                    uiState.error != null && uiState.items.isEmpty() -> "error"
                    uiState.items.isEmpty() -> "empty"
                    else -> "list"
                }

                AnimatedContent(
                    targetState = phase,
                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                    label = "requests_phase"
                ) { target ->
                    when (target) {
                        "loading" -> RequestsSkeleton()
                        "error" -> EmptyState(
                            icon = Icons.Default.Inbox,
                            title = stringResource(R.string.requests_inbox_error_title),
                            message = uiState.error.orEmpty(),
                            actionText = stringResource(R.string.requests_inbox_error_retry),
                            onAction = { viewModel.refresh() }
                        )
                        "empty" -> EmptyState(
                            icon = Icons.Default.Inbox,
                            title = stringResource(R.string.requests_inbox_empty_title),
                            message = stringResource(R.string.requests_inbox_empty_message)
                        )
                        else -> RequestsList(
                            requests = uiState.items,
                            isLoadingMore = uiState.isLoadingMore,
                            onOpen = onOpenDetail,
                            onLoadMore = { id -> viewModel.loadMoreIfNeeded(id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterRow(
    selected: RequestsStatusFilter,
    onSelect: (RequestsStatusFilter) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(RequestsStatusFilter.entries) { filter ->
            FilterChip(
                selected = selected == filter,
                onClick = { onSelect(filter) },
                label = {
                    Text(
                        when (filter) {
                            RequestsStatusFilter.ALL -> stringResource(R.string.requests_inbox_filter_all)
                            RequestsStatusFilter.PENDING -> stringResource(R.string.requests_inbox_filter_pending)
                            RequestsStatusFilter.RESPONDED -> stringResource(R.string.requests_inbox_filter_responded)
                            RequestsStatusFilter.BOOKED -> stringResource(R.string.requests_inbox_filter_booked)
                        }
                    )
                }
            )
        }
    }
}

@Composable
private fun RequestsList(
    requests: List<PublicRequest>,
    isLoadingMore: Boolean,
    onOpen: (String) -> Unit,
    onLoadMore: (String) -> Unit
) {
    val listState = rememberLazyListState()
    val shouldLoadMore by remember {
        derivedStateOf {
            val info = listState.layoutInfo
            val last = info.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= requests.lastIndex - 2
        }
    }
    LaunchedEffect(shouldLoadMore, requests.size) {
        if (shouldLoadMore && requests.isNotEmpty()) {
            onLoadMore(requests.last().id)
        }
    }

    LazyColumn(
        state = listState,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(requests, key = { it.id }) { request ->
            RequestRowCard(request = request, onClick = { onOpen(request.id) })
        }
        if (isLoadingMore) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                }
            }
        }
    }
}

@Composable
private fun RequestRowCard(request: PublicRequest, onClick: () -> Unit) {
    val unreadLabel = stringResource(R.string.requests_unread)
    val a11y = buildString {
        append(request.displayName)
        request.eventType?.let { append(", ").append(it) }
        append(", ").append(statusLabel(request.status))
        if (!request.isRead) append(", ").append(unreadLabel)
    }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = a11y }
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            if (!request.isRead) {
                Box(
                    modifier = Modifier
                        .padding(top = 6.dp, end = 10.dp)
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(SolennixTheme.colors.primary)
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = request.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (request.isRead) FontWeight.Normal else FontWeight.SemiBold
                )
                Text(
                    text = request.eventType ?: stringResource(R.string.requests_fallback_event),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                val meta = listOfNotNull(
                    request.eventDate?.takeIf { it.isNotBlank() },
                    request.location?.takeIf { it.isNotBlank() }
                ).joinToString(" · ")
                if (meta.isNotBlank()) {
                    Text(
                        text = meta,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            StatusChip(status = request.status)
        }
    }
}

@Composable
internal fun StatusChip(status: String) {
    val color = when (status) {
        "pending", "info_requested" -> SolennixTheme.colors.warning
        "responded", "accepted_by_client" -> SolennixTheme.colors.info
        "booked" -> SolennixTheme.colors.success
        else -> SolennixTheme.colors.error
    }
    Text(
        text = statusLabel(status),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = color,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    )
}

@Composable
internal fun statusLabel(status: String): String = when (status) {
    "pending" -> stringResource(R.string.requests_status_pending)
    "info_requested" -> stringResource(R.string.requests_status_info_requested)
    "responded" -> stringResource(R.string.requests_status_responded)
    "accepted_by_client" -> stringResource(R.string.requests_status_accepted)
    "declined_provider" -> stringResource(R.string.requests_status_declined_provider)
    "declined_client" -> stringResource(R.string.requests_status_declined_client)
    "booked" -> stringResource(R.string.requests_status_booked)
    "expired" -> stringResource(R.string.requests_status_expired)
    else -> status
}

@Composable
private fun RequestsSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        repeat(6) {
            SkeletonLoading(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(88.dp)
                    .clip(RoundedCornerShape(16.dp))
            )
        }
    }
}
