package com.creapolis.solennix.feature.settings.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventFormLink
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.settings.viewmodel.EventFormLinksUiState
import com.creapolis.solennix.feature.settings.viewmodel.EventFormLinksViewModel
import java.time.format.DateTimeFormatter
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventFormLinksScreen(
    viewModel: EventFormLinksViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarMessage by viewModel.snackbarMessage.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    var showGenerateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearSnackbar()
        }
    }

    if (showGenerateDialog) {
        GenerateLinkDialog(
            isGenerating = (uiState as? EventFormLinksUiState.Success)?.isGenerating == true,
            onGenerate = { label, ttlDays ->
                viewModel.generateLink(label, ttlDays)
                showGenerateDialog = false
            },
            onDismiss = { showGenerateDialog = false }
        )
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Enlaces de Formulario") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Regresar")
                    }
                }
            )
        },
        floatingActionButton = {
            val isLoading = uiState is EventFormLinksUiState.Loading
            val isGenerating = (uiState as? EventFormLinksUiState.Success)?.isGenerating == true
            ExtendedFloatingActionButton(
                onClick = { showGenerateDialog = true },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Nuevo enlace") },
                containerColor = SolennixTheme.colors.primary,
                contentColor = Color.White,
                expanded = !isLoading && !isGenerating
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 700.dp) {
            when (val state = uiState) {
                is EventFormLinksUiState.Loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = SolennixTheme.colors.primary)
                    }
                }

                is EventFormLinksUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = SolennixTheme.colors.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = state.message,
                            style = MaterialTheme.typography.bodyLarge,
                            color = SolennixTheme.colors.primaryText
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedButton(onClick = { viewModel.loadLinks() }) {
                            Text("Reintentar")
                        }
                    }
                }

                is EventFormLinksUiState.Success -> {
                    if (state.links.isEmpty()) {
                        EmptyState(
                            icon = Icons.Default.Link,
                            title = "Sin enlaces",
                            message = "Crea un enlace para que tus clientes soliciten eventos",
                            modifier = Modifier.padding(padding)
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(padding),
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 8.dp,
                                bottom = 88.dp
                            ),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.links, key = { it.id }) { link ->
                                EventFormLinkCard(
                                    link = link,
                                    isDeleting = state.deletingId == link.id,
                                    onShare = { shareLink(context, link) },
                                    onCopy = { copyLink(context, link) },
                                    onDelete = { viewModel.deleteLink(link.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EventFormLinkCard(
    link: EventFormLink,
    isDeleting: Boolean,
    onShare: () -> Unit,
    onCopy: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Eliminar enlace") },
            text = { Text("¿Estás seguro de que querés eliminar este enlace? Esta acción no se puede deshacer.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                ) {
                    Text("Eliminar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header: label + status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = link.label ?: "Sin etiqueta",
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                FormLinkStatusChip(status = link.status)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // URL (truncated)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Link,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = link.url,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Dates
            val dateFormatter = remember {
                DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "MX"))
            }
            val createdDate = remember(link.createdAt) {
                parseFlexibleDate(link.createdAt)?.format(dateFormatter) ?: link.createdAt
            }
            val expiresDate = remember(link.expiresAt) {
                parseFlexibleDate(link.expiresAt)?.format(dateFormatter) ?: link.expiresAt
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.CalendarToday,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Creado: $createdDate",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Schedule,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Expira: $expiresDate",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            // Used at (if submitted)
            link.usedAt?.let { usedAt ->
                Spacer(modifier = Modifier.height(2.dp))
                val usedDate = remember(usedAt) {
                    parseFlexibleDate(usedAt)?.format(dateFormatter) ?: usedAt
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.success
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Usado: $usedDate",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.success
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(8.dp))

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isDeleting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp,
                        color = SolennixTheme.colors.error
                    )
                } else {
                    // Share
                    IconButton(onClick = onShare) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Compartir enlace",
                            tint = SolennixTheme.colors.primary
                        )
                    }
                    // Copy
                    IconButton(onClick = onCopy) {
                        Icon(
                            Icons.Default.ContentCopy,
                            contentDescription = "Copiar enlace",
                            tint = SolennixTheme.colors.secondaryText
                        )
                    }
                    // Delete
                    IconButton(onClick = { showDeleteConfirm = true }) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Eliminar enlace",
                            tint = SolennixTheme.colors.error
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FormLinkStatusChip(status: String) {
    val (label, color) = when (status.lowercase()) {
        "active" -> "Activo" to SolennixTheme.colors.success
        "used" -> "Usado" to SolennixTheme.colors.primary
        "expired" -> "Expirado" to SolennixTheme.colors.error
        "revoked" -> "Revocado" to SolennixTheme.colors.secondaryText
        else -> status.replaceFirstChar { it.uppercase() } to SolennixTheme.colors.secondaryText
    }

    Surface(
        color = color.copy(alpha = 0.18f),
        shape = RoundedCornerShape(6.dp)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            color = color,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
        )
    }
}

@Composable
private fun GenerateLinkDialog(
    isGenerating: Boolean,
    onGenerate: (label: String?, ttlDays: Int?) -> Unit,
    onDismiss: () -> Unit
) {
    var label by remember { mutableStateOf("") }
    var ttlDaysText by remember { mutableStateOf("7") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nuevo enlace de formulario") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text("Etiqueta (opcional)") },
                    placeholder = { Text("Ej: Boda García") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        unfocusedBorderColor = SolennixTheme.colors.divider
                    )
                )
                OutlinedTextField(
                    value = ttlDaysText,
                    onValueChange = { ttlDaysText = it.filter { c -> c.isDigit() } },
                    label = { Text("Días de vigencia") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        unfocusedBorderColor = SolennixTheme.colors.divider
                    )
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val ttl = ttlDaysText.toIntOrNull()
                    onGenerate(label.takeIf { it.isNotBlank() }, ttl)
                },
                enabled = !isGenerating
            ) {
                if (isGenerating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = SolennixTheme.colors.primary
                    )
                } else {
                    Text("Generar", color = SolennixTheme.colors.primary)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}

private fun shareLink(context: Context, link: EventFormLink) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, link.url)
        putExtra(
            Intent.EXTRA_SUBJECT,
            "Formulario de evento${link.label?.let { " - $it" } ?: ""}"
        )
    }
    context.startActivity(Intent.createChooser(intent, "Compartir enlace"))
}

private fun copyLink(context: Context, link: EventFormLink) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText("Enlace de formulario", link.url)
    clipboard.setPrimaryClip(clip)
}
