package com.creapolis.solennix.feature.events.ui

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.util.LocalNavAnimatedVisibilityScope
import com.creapolis.solennix.core.designsystem.util.LocalSharedTransitionScope
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.viewmodel.EventListViewModel
import com.creapolis.solennix.feature.events.viewmodel.EventStatusFilter
import kotlinx.coroutines.delay
import java.io.File
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import java.time.format.DateTimeFormatter
import java.util.*

private fun exportEventsCsv(context: Context, csvContent: String) {
    try {
        val file = File(context.cacheDir, "eventos.csv")
        file.writeText(csvContent)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "Eventos - Exportación CSV")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Exportar Eventos"))
    } catch (e: Exception) {
        Toast.makeText(context, "Error al exportar: ${e.message}", Toast.LENGTH_SHORT).show()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventListScreen(
    viewModel: EventListViewModel,
    onEventClick: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onSearchClick: (() -> Unit)? = null,
    showBackButton: Boolean = true
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pagedEvents = viewModel.pagedEvents.collectAsLazyPagingItems()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    LifecycleResumeEffect(viewModel) {
        viewModel.refresh()
        onPauseOrDispose { }
    }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            val result = snackbarHostState.showSnackbar(
                message = it,
                actionLabel = "Reintentar",
                duration = SnackbarDuration.Short
            )
            if (result == SnackbarResult.ActionPerformed) {
                viewModel.refresh()
            }
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            SolennixTopAppBar(
                title = { Text("Eventos") },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    if (showBackButton) {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Regresar")
                        }
                    }
                },
                actions = {
                    IconButton(onClick = {
                        val csv = viewModel.generateCsvContent()
                        exportEventsCsv(context, csv)
                    }) {
                        Icon(Icons.Default.FileDownload, contentDescription = "Exportar CSV")
                    }
                }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Search and Filter Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = uiState.searchQuery,
                        onValueChange = { viewModel.onSearchQueryChange(it) },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Filtrar eventos...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        trailingIcon = {
                            if (uiState.searchQuery.isNotEmpty()) {
                                IconButton(onClick = { viewModel.onSearchQueryChange("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Limpiar")
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
                            containerColor = if (uiState.startDate != null) 
                                SolennixTheme.colors.primaryLight 
                            else Color.Transparent
                        )
                    ) {
                        Icon(
                            Icons.Default.DateRange, 
                            contentDescription = "Rango de fechas",
                            tint = if (uiState.startDate != null) 
                                SolennixTheme.colors.primary 
                            else SolennixTheme.colors.secondaryText
                        )
                    }

                    if (showDateRangePicker) {
                        val dateRangePickerState = rememberDateRangePickerState()
                        DatePickerDialog(
                            onDismissRequest = { showDateRangePicker = false },
                            confirmButton = {
                                TextButton(onClick = {
                                    val start = dateRangePickerState.selectedStartDateMillis?.let {
                                        java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                                    }
                                    val end = dateRangePickerState.selectedEndDateMillis?.let {
                                        java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                                    }
                                    viewModel.onDateRangeChange(start, end)
                                    showDateRangePicker = false
                                }) { Text("Aplicar") }
                            },
                            dismissButton = {
                                TextButton(onClick = { showDateRangePicker = false }) { Text("Cancelar") }
                            }
                        ) {
                            DateRangePicker(
                                state = dateRangePickerState,
                                modifier = Modifier.height(400.dp),
                                title = { Text("Seleccioná el rango") },
                                headline = { Text("Filtro de fechas") },
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

                // Active Filters Chips
                if (uiState.startDate != null || uiState.selectedStatus != null) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (uiState.startDate != null) {
                            val formatter = DateTimeFormatter.ofPattern("dd/MM", Locale("es", "MX"))
                            val label = "${uiState.startDate!!.format(formatter)} - ${uiState.endDate?.format(formatter) ?: "..."}"
                            FilterChip(
                                selected = true,
                                onClick = { viewModel.onDateRangeChange(null, null) },
                                label = { Text(label) },
                                trailingIcon = { Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            )
                        }
                        
                        TextButton(onClick = { viewModel.clearFilters() }) {
                            Text("Limpiar todo", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }

                // Status Filter Chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    uiState.statusFilters.forEach { filter ->
                        val isSelected = filter.status == uiState.selectedStatus
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.onStatusFilterChange(filter.status) },
                            label = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(filter.label)
                                    if (filter.count > 0) {
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Badge(
                                            containerColor = if (isSelected)
                                                MaterialTheme.colorScheme.primary
                                            else
                                                SolennixTheme.colors.secondaryText.copy(alpha = 0.3f)
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

                val isLoading = pagedEvents.loadState.refresh is LoadState.Loading
                val isError = pagedEvents.loadState.refresh is LoadState.Error
                val isEmpty = pagedEvents.itemCount == 0 && !isLoading

                AnimatedContent(
                    targetState = when {
                        isLoading && pagedEvents.itemCount == 0 -> "loading"
                        isEmpty -> "empty"
                        else -> "content"
                    },
                    transitionSpec = {
                        fadeIn() togetherWith fadeOut()
                    },
                    label = "eventListState"
                ) { screenState ->
                    when (screenState) {
                        "loading" -> EventListSkeleton()
                        "empty" -> EmptyState(
                            icon = Icons.Default.EventBusy,
                            title = if (uiState.searchQuery.isNotEmpty()) "Sin resultados" else "Sin eventos",
                            message = if (uiState.searchQuery.isNotEmpty())
                                "No se encontraron eventos con ese filtro"
                            else
                                "Crea tu primer evento para comenzar"
                        )
                        else -> AdaptiveCardGrid(
                            contentPadding = PaddingValues(vertical = 8.dp),
                            gridContent = {
                                items(
                                    count = pagedEvents.itemCount,
                                    key = pagedEvents.itemKey { it.id }
                                ) { index ->
                                    pagedEvents[index]?.let { event ->
                                        val client = uiState.clientMap[event.clientId]
                                        AnimatedEventListItem(
                                            index = index,
                                            event = event,
                                            clientName = client?.name,
                                            onClick = { onEventClick(event.id) }
                                        )
                                    }
                                }
                            },
                            listContent = {
                                items(
                                    count = pagedEvents.itemCount,
                                    key = pagedEvents.itemKey { it.id }
                                ) { index ->
                                    pagedEvents[index]?.let { event ->
                                        val client = uiState.clientMap[event.clientId]
                                        AnimatedEventListItem(
                                            index = index,
                                            event = event,
                                            clientName = client?.name,
                                            onClick = { onEventClick(event.id) }
                                        )
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EventListSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 8.dp)
    ) {
        repeat(5) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .height(20.dp)
                                .fillMaxWidth(0.45f)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(24.dp)
                                .width(92.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(16.dp)
                            .fillMaxWidth(0.7f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(16.dp)
                            .fillMaxWidth(0.55f)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = SolennixTheme.colors.divider)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .height(16.dp)
                                .width(110.dp)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(20.dp)
                                .width(90.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AnimatedEventListItem(
    index: Int,
    event: Event,
    clientName: String?,
    onClick: () -> Unit
) {
    var visible by remember(event.id) { mutableStateOf(false) }

    val context = LocalContext.current
    val durationScale = remember {
        android.provider.Settings.Global.getFloat(
            context.contentResolver,
            android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        )
    }

    LaunchedEffect(event.id) {
        if (durationScale > 0f) {
            delay((index.coerceAtMost(5) * 45L * durationScale).toLong())
        }
        visible = true
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn() + slideInVertically(initialOffsetY = { it / 6 }),
        label = "eventListItemVisibility"
    ) {
        EventListItem(
            event = event,
            clientName = clientName,
            onClick = onClick
        )
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun EventListItem(
    event: Event,
    clientName: String?,
    onClick: () -> Unit
) {
    val eventDate = remember(event.eventDate) {
        val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "MX"))
        parseFlexibleDate(event.eventDate)?.format(dateFormatter) ?: event.eventDate
    }
    val accessibilitySummary = remember(event, clientName, eventDate) {
        eventCardTalkBackLabel(event, clientName, eventDate)
    }

    val sharedTransitionScope = LocalSharedTransitionScope.current
    val animatedVisibilityScope = LocalNavAnimatedVisibilityScope.current
    val baseModifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 16.dp, vertical = 4.dp)
        .semantics(mergeDescendants = true) { contentDescription = accessibilitySummary }
    val cardModifier = if (sharedTransitionScope != null && animatedVisibilityScope != null) {
        with(sharedTransitionScope) {
            Modifier.sharedBounds(
                rememberSharedContentState(key = "event_card_${event.id}"),
                animatedVisibilityScope = animatedVisibilityScope
            ).then(baseModifier)
        }
    } else baseModifier

    Card(
        onClick = onClick,
        modifier = cardModifier,
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = event.serviceType,
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText
                )
                StatusBadge(status = event.status.name.lowercase())
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Date and time row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = eventDate,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = event.startTime ?: "Todo el día",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            // Client name
            if (clientName != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = clientName,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        maxLines = 1
                    )
                }
            }

            // Location
            event.location?.let { location ->
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = location,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(8.dp))

            // People count and total amount
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${event.numPeople} personas",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Text(
                    text = event.totalAmount.asMXN(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primary
                )
            }
        }
    }
}

internal fun eventCardTalkBackLabel(event: Event, clientName: String?, formattedDate: String): String {
    return buildString {
        append(event.serviceType)
        append(", estado ${event.status.name.lowercase()}")
        append(", fecha $formattedDate")
        append(", hora ${event.startTime ?: "todo el día"}")
        clientName?.takeIf { it.isNotBlank() }?.let { append(", cliente $it") }
        event.location?.takeIf { it.isNotBlank() }?.let { append(", ubicación $it") }
        append(", ${event.numPeople} personas")
        append(", total ${event.totalAmount.asMXN()}")
    }
}
