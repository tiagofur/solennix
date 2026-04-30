package com.creapolis.solennix.feature.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.TopClient
import com.creapolis.solennix.core.model.extensions.asMXNCompact
import com.creapolis.solennix.feature.dashboard.R

@Composable
fun TopClientsWidget(
    clients: List<TopClient>,
    isLoading: Boolean,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                stringResource(R.string.dashboard_widget_top_clients_title),
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            when {
                isLoading -> {
                    repeat(3) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .padding(vertical = 4.dp)
                                .background(
                                    SolennixTheme.colors.surfaceAlt,
                                    RoundedCornerShape(8.dp)
                                )
                        )
                    }
                }
                clients.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            stringResource(R.string.dashboard_widget_top_clients_empty),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                else -> {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(clients) { client ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Person,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Column {
                                        Text(
                                            client.name,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.primaryText,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            pluralStringResource(R.plurals.dashboard_widget_top_clients_events, client.totalEvents, client.totalEvents),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                }
                                Text(
                                    client.totalSpent.asMXNCompact(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.kpiGreen,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
