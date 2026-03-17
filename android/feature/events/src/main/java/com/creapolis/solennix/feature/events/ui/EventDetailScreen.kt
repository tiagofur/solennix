package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel

import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit,
    onEditClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    val windowInfoTracker = WindowInfoTracker.getOrCreate(context)
    val windowLayoutInfo by windowInfoTracker.windowLayoutInfo(context as android.app.Activity)
        .collectAsState(initial = null)

    val foldingFeature = windowLayoutInfo?.displayFeatures
        ?.filterIsInstance<FoldingFeature>()
        ?.firstOrNull()

    val isTableTop = foldingFeature?.state == FoldingFeature.State.HALF_OPENED &&
            foldingFeature.orientation == FoldingFeature.Orientation.HORIZONTAL

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle del Evento") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    uiState.event?.let { event ->
                        IconButton(onClick = { onEditClick(event.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.event != null) {
            val event = uiState.event!!
            
            if (isTableTop) {
                // Table-top mode: Split screen
                Column(modifier = Modifier.padding(padding).fillMaxSize()) {
                    Box(modifier = Modifier.weight(1f)) {
                        EventCard(event = event)
                    }
                    Box(modifier = Modifier.weight(1f).padding(16.dp)) {
                        ActionGrid(onPdfClick = {}, onChecklistClick = {}, onPhotosClick = {})
                    }
                }
            } else {
                // Normal mode
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(scrollState)
                        .padding(16.dp)
                ) {
                    EventCard(event = event)
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("Acciones", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(12.dp))
                    ActionGrid(onPdfClick = {}, onChecklistClick = {}, onPhotosClick = {})
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("Detalles Financieros", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(12.dp))
                    SummaryRow("Total del Evento", "$${event.totalAmount}", isTotal = true)
                }
            }
        }
    }
}

@Composable
fun EventCard(event: com.creapolis.solennix.core.model.Event) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusBadge(status = event.status.name)
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = event.eventDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = event.serviceType,
                style = MaterialTheme.typography.headlineSmall,
                color = SolennixTheme.colors.primaryText
            )
            Text(
                text = "${event.numPeople} personas",
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText
            )
        }
    }
}

@Composable
fun ActionGrid(onPdfClick: () -> Unit, onChecklistClick: () -> Unit, onPhotosClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth()) {
        ActionButton(
            icon = Icons.Default.Description,
            label = "PDF",
            modifier = Modifier.weight(1f),
            onClick = onPdfClick
        )
        Spacer(modifier = Modifier.width(8.dp))
        ActionButton(
            icon = Icons.Default.Checklist,
            label = "Checklist",
            modifier = Modifier.weight(1f),
            onClick = onChecklistClick
        )
        Spacer(modifier = Modifier.width(8.dp))
        ActionButton(
            icon = Icons.Default.PhotoLibrary,
            label = "Fotos",
            modifier = Modifier.weight(1f),
            onClick = onPhotosClick
        )
    }
}

@Composable
fun ActionButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(80.dp),
        shape = MaterialTheme.shapes.medium,
        contentPadding = PaddingValues(0.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(imageVector = icon, contentDescription = null)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = label, style = MaterialTheme.typography.labelSmall)
        }
    }
}
