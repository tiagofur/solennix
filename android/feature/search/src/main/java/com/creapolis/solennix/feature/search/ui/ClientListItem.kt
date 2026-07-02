package com.creapolis.solennix.feature.search.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.Modifier
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.Spacing
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.search.R

/**
 * Local copy of the client row used in search results.
 *
 * `feature/search` must not depend on internals of `feature/clients` (former
 * module leak via `com.creapolis.solennix.feature.clients.ui.ClientListItem`).
 * `core/designsystem` is kept free of domain models, so a feature-local copy is
 * the clean option — each feature owns its presentation of shared models.
 * Mirrors the clients implementation verbatim to keep the result rows visually
 * identical across search and the client list.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ClientListItem(
    client: Client,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(name = client.name, photoUrl = UrlResolver.resolve(client.photoUrl), size = 48.dp)
        Spacer(modifier = Modifier.width(Spacing.md))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = client.name,
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )
            Text(
                text = client.phone,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )
            client.totalEvents?.let { events ->
                if (events > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = pluralStringResource(R.plurals.search_client_event_count, events, events),
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                        client.totalSpent?.let { spent ->
                            if (spent > 0.0) {
                                Text(
                                    text = spent.asMXN(),
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = SolennixTheme.colors.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
