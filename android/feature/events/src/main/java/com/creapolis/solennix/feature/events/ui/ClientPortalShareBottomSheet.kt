package com.creapolis.solennix.feature.events.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.ClientPortalShareUiState
import com.creapolis.solennix.feature.events.viewmodel.ClientPortalShareViewModel

/**
 * Portal del cliente share bottom sheet (PRD/12 feature A).
 *
 * Three UX states:
 *   1. loading — spinner
 *   2. has-link — URL + Copiar / Compartir / Rotar / Deshabilitar
 *   3. no-link — single "Generar enlace" CTA
 *
 * Confirmation dialogs gate Rotar and Deshabilitar because both are
 * destructive from the client's perspective.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientPortalShareBottomSheet(
    eventId: String,
    onDismiss: () -> Unit,
    viewModel: ClientPortalShareViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current

    // Kick off the initial fetch when the sheet opens. Re-runs if the
    // caller reuses the same VM with a different event id.
    LaunchedEffect(eventId) {
        viewModel.load(eventId)
    }

    // Surface errors via Toast (EventDetailScreen's parent Scaffold has
    // no SnackbarHost and the DocumentActionsGrid already uses Toasts
    // for its own errors — keeps UX consistent in this surface).
    LaunchedEffect(uiState.error) {
        val err = uiState.error
        if (err != null) {
            Toast.makeText(context, err, Toast.LENGTH_LONG).show()
            viewModel.consumeError()
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        ClientPortalShareContent(
            uiState = uiState,
            onGenerate = viewModel::generate,
            onRotate = viewModel::rotate,
            onRevoke = viewModel::revoke,
            onCopy = { copyToClipboard(context, it) },
            onShare = { shareLink(context, it) }
        )
    }
}

@Composable
private fun ClientPortalShareContent(
    uiState: ClientPortalShareUiState,
    onGenerate: () -> Unit,
    onRotate: () -> Unit,
    onRevoke: () -> Unit,
    onCopy: (String) -> Unit,
    onShare: (String) -> Unit
) {
    var showRotateConfirm by remember { mutableStateOf(false) }
    var showRevokeConfirm by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 8.dp)
    ) {
        // Header
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Link,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = stringResource(R.string.events_client_portal_title),
                style = MaterialTheme.typography.titleLarge
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.events_client_portal_description),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(20.dp))

        when {
            uiState.isLoading -> LoadingState()
            uiState.link != null -> HasLinkState(
                url = uiState.link.url,
                isBusy = uiState.isBusy,
                onCopy = { onCopy(uiState.link.url) },
                onShare = { onShare(uiState.link.url) },
                onRotate = { showRotateConfirm = true },
                onRevoke = { showRevokeConfirm = true }
            )
            else -> EmptyState(
                isBusy = uiState.isBusy,
                onGenerate = onGenerate
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
    }

    if (showRotateConfirm) {
        AlertDialog(
            onDismissRequest = { showRotateConfirm = false },
            title = { Text(stringResource(R.string.events_client_portal_rotate_title)) },
            text = {
                Text(stringResource(R.string.events_client_portal_rotate_message))
            },
            confirmButton = {
                TextButton(onClick = {
                    showRotateConfirm = false
                    onRotate()
                }) { Text(stringResource(R.string.events_client_portal_rotate)) }
            },
            dismissButton = {
                TextButton(onClick = { showRotateConfirm = false }) {
                    Text(stringResource(android.R.string.cancel))
                }
            }
        )
    }

    if (showRevokeConfirm) {
        AlertDialog(
            onDismissRequest = { showRevokeConfirm = false },
            title = { Text(stringResource(R.string.events_client_portal_disable_title)) },
            text = {
                Text(stringResource(R.string.events_client_portal_disable_message))
            },
            confirmButton = {
                TextButton(onClick = {
                    showRevokeConfirm = false
                    onRevoke()
                }) { Text(stringResource(R.string.events_client_portal_disable)) }
            },
            dismissButton = {
                TextButton(onClick = { showRevokeConfirm = false }) {
                    Text(stringResource(android.R.string.cancel))
                }
            }
        )
    }
}

@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(96.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun HasLinkState(
    url: String,
    isBusy: Boolean,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onRotate: () -> Unit,
    onRevoke: () -> Unit
) {
    Column {
        // URL pill
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Text(
                text = url,
                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Spacer(modifier = Modifier.height(16.dp))

        // Primary actions: Copiar + Compartir
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(onClick = onCopy, enabled = !isBusy) {
                Icon(
                    imageVector = Icons.Default.ContentCopy,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.events_client_portal_copy_link))
            }
            OutlinedButton(onClick = onShare, enabled = !isBusy) {
                Icon(
                    imageVector = Icons.Default.Share,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.events_client_portal_share))
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Secondary actions: Rotar + Deshabilitar
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(onClick = onRotate, enabled = !isBusy) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.events_client_portal_rotate))
            }
            TextButton(
                onClick = onRevoke,
                enabled = !isBusy
            ) {
                Icon(
                    imageVector = Icons.Default.LinkOff,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.events_client_portal_disable),
                    color = MaterialTheme.colorScheme.error
                )
            }
        }

        if (isBusy) {
            Spacer(modifier = Modifier.height(12.dp))
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
private fun EmptyState(
    isBusy: Boolean,
    onGenerate: () -> Unit
) {
    Button(
        onClick = onGenerate,
        enabled = !isBusy,
        modifier = Modifier.fillMaxWidth()
    ) {
        if (isBusy) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                color = Color.White,
                strokeWidth = 2.dp
            )
        } else {
            Icon(
                imageVector = Icons.Default.Link,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(stringResource(R.string.events_client_portal_generate))
    }
}

// ===== Helpers =====

private fun copyToClipboard(context: Context, url: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
    val clip = ClipData.newPlainText(context.getString(R.string.events_client_portal_clipboard_label), url)
    clipboard?.setPrimaryClip(clip)
    Toast.makeText(context, context.getString(R.string.events_client_portal_copy_toast), Toast.LENGTH_SHORT).show()
}

private fun shareLink(context: Context, url: String) {
    val text = context.getString(R.string.events_client_portal_share_message, url)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(intent, context.getString(R.string.events_client_portal_share_chooser)))
}
