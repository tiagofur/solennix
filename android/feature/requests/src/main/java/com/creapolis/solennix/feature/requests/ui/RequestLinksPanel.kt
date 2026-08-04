package com.creapolis.solennix.feature.requests.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.PublicRequestLink
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.requests.R
import com.creapolis.solennix.feature.requests.viewmodel.RequestLinksUiState
import com.creapolis.solennix.feature.requests.viewmodel.RequestLinksViewModel
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestLinksPanel(
    viewModel: RequestLinksViewModel,
    snackbarHostState: SnackbarHostState
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarMessage by viewModel.snackbarMessage.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showGenerateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearSnackbar()
        }
    }

    if (showGenerateDialog) {
        GenerateRequestLinkDialog(
            isGenerating = (uiState as? RequestLinksUiState.Success)?.isGenerating == true,
            onGenerate = { label, ttlDays, maxUses, submitMode ->
                viewModel.generateLink(label, ttlDays, maxUses, submitMode)
                showGenerateDialog = false
            },
            onDismiss = { showGenerateDialog = false }
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AdaptiveCenteredContent(maxWidth = 700.dp) {
            when (val state = uiState) {
                is RequestLinksUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = SolennixTheme.colors.primary)
                    }
                }

                is RequestLinksUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
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
                            Text(stringResource(R.string.requests_links_retry))
                        }
                    }
                }

                is RequestLinksUiState.Success -> {
                    if (state.links.isEmpty()) {
                        EmptyState(
                            icon = Icons.Default.Link,
                            title = stringResource(R.string.requests_links_empty_title),
                            message = stringResource(R.string.requests_links_empty_message)
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 8.dp,
                                bottom = 88.dp
                            ),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.links, key = { it.id }) { link ->
                                RequestLinkCard(
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

        val isLoading = uiState is RequestLinksUiState.Loading
        val isGenerating = (uiState as? RequestLinksUiState.Success)?.isGenerating == true
        ExtendedFloatingActionButton(
            onClick = { showGenerateDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            icon = { Icon(Icons.Default.Add, contentDescription = null) },
            text = { Text(stringResource(R.string.requests_links_new_link)) },
            containerColor = SolennixTheme.colors.primary,
            contentColor = Color.White,
            expanded = !isLoading && !isGenerating
        )
    }
}

@Composable
private fun RequestLinkCard(
    link: PublicRequestLink,
    isDeleting: Boolean,
    onShare: () -> Unit,
    onCopy: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text(stringResource(R.string.requests_links_delete_title)) },
            text = { Text(stringResource(R.string.requests_links_delete_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                ) {
                    Text(stringResource(R.string.requests_links_delete_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text(stringResource(R.string.requests_links_cancel))
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = link.label ?: stringResource(R.string.requests_links_no_label),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                RequestLinkStatusChip(status = link.status)
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = submitModeLabel(link.submitMode),
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )

            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Link,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = link.shareUrl,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(4.dp))
            val dateFormatter = remember {
                DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.forLanguageTag("es-MX"))
            }
            val createdDate = remember(link.createdAt) {
                parseFlexibleDate(link.createdAt)?.format(dateFormatter) ?: link.createdAt
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
                    text = stringResource(R.string.requests_links_created_on, createdDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            link.expiresAt?.takeIf { it.isNotBlank() }?.let { expiresAt ->
                Spacer(modifier = Modifier.height(2.dp))
                val expiresDate = remember(expiresAt) {
                    parseFlexibleDate(expiresAt)?.format(dateFormatter) ?: expiresAt
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
                        text = stringResource(R.string.requests_links_expires_on, expiresDate),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            link.maxUses?.let { max ->
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = stringResource(
                        R.string.requests_links_uses,
                        link.useCount,
                        max
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(8.dp))

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
                    IconButton(onClick = onShare) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = stringResource(R.string.requests_links_share),
                            tint = SolennixTheme.colors.primary
                        )
                    }
                    IconButton(onClick = onCopy) {
                        Icon(
                            Icons.Default.ContentCopy,
                            contentDescription = stringResource(R.string.requests_links_copy),
                            tint = SolennixTheme.colors.secondaryText
                        )
                    }
                    IconButton(onClick = { showDeleteConfirm = true }) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = stringResource(R.string.requests_links_delete_title),
                            tint = SolennixTheme.colors.error
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RequestLinkStatusChip(status: String) {
    val (label, color) = when (status.lowercase()) {
        "active" -> stringResource(R.string.requests_links_status_active) to SolennixTheme.colors.success
        "used" -> stringResource(R.string.requests_links_status_used) to SolennixTheme.colors.primary
        "expired" -> stringResource(R.string.requests_links_status_expired) to SolennixTheme.colors.error
        "revoked" -> stringResource(R.string.requests_links_status_revoked) to SolennixTheme.colors.secondaryText
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
private fun submitModeLabel(mode: String): String {
    return when (mode) {
        "auto_quote" -> stringResource(R.string.requests_links_mode_auto_quote)
        "standard" -> stringResource(R.string.requests_links_mode_standard)
        else -> stringResource(R.string.requests_links_mode_auto_event)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GenerateRequestLinkDialog(
    isGenerating: Boolean,
    onGenerate: (label: String?, ttlDays: Int?, maxUses: Int?, submitMode: String) -> Unit,
    onDismiss: () -> Unit
) {
    var label by remember { mutableStateOf("") }
    var ttlDaysText by remember { mutableStateOf("7") }
    var maxUsesText by remember { mutableStateOf("1") }
    var submitMode by remember { mutableStateOf("auto_event") }
    var modeExpanded by remember { mutableStateOf(false) }

    val modeOptions = listOf(
        "auto_event" to stringResource(R.string.requests_links_mode_auto_event),
        "auto_quote" to stringResource(R.string.requests_links_mode_auto_quote),
        "standard" to stringResource(R.string.requests_links_mode_standard)
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.requests_links_generate_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text(stringResource(R.string.requests_links_label_field)) },
                    placeholder = { Text(stringResource(R.string.requests_links_label_placeholder)) },
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
                    label = { Text(stringResource(R.string.requests_links_ttl_days)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        unfocusedBorderColor = SolennixTheme.colors.divider
                    )
                )
                OutlinedTextField(
                    value = maxUsesText,
                    onValueChange = { maxUsesText = it.filter { c -> c.isDigit() } },
                    label = { Text(stringResource(R.string.requests_links_max_uses)) },
                    placeholder = { Text(stringResource(R.string.requests_links_max_uses_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        unfocusedBorderColor = SolennixTheme.colors.divider
                    )
                )
                ExposedDropdownMenuBox(
                    expanded = modeExpanded,
                    onExpandedChange = { modeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = modeOptions.first { it.first == submitMode }.second,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(stringResource(R.string.requests_links_submit_mode)) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = modeExpanded) },
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = SolennixTheme.colors.primary,
                            unfocusedBorderColor = SolennixTheme.colors.divider
                        )
                    )
                    ExposedDropdownMenu(
                        expanded = modeExpanded,
                        onDismissRequest = { modeExpanded = false }
                    ) {
                        modeOptions.forEach { (value, labelText) ->
                            DropdownMenuItem(
                                text = { Text(labelText) },
                                onClick = {
                                    submitMode = value
                                    modeExpanded = false
                                }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val ttl = ttlDaysText.toIntOrNull()
                    val maxUses = maxUsesText.toIntOrNull()
                    onGenerate(label.takeIf { it.isNotBlank() }, ttl, maxUses, submitMode)
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
                    Text(
                        stringResource(R.string.requests_links_generate),
                        color = SolennixTheme.colors.primary
                    )
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.requests_links_cancel))
            }
        }
    )
}

private fun shareLink(context: Context, link: PublicRequestLink) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, link.shareUrl)
        val subject = link.label?.let { label ->
            context.getString(R.string.requests_links_share_subject_with_label, label)
        } ?: context.getString(R.string.requests_links_share_subject)
        putExtra(Intent.EXTRA_SUBJECT, subject)
    }
    context.startActivity(
        Intent.createChooser(intent, context.getString(R.string.requests_links_share))
    )
}

private fun copyLink(context: Context, link: PublicRequestLink) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText(
        context.getString(R.string.requests_links_clip_label),
        link.shareUrl
    )
    clipboard.setPrimaryClip(clip)
}
