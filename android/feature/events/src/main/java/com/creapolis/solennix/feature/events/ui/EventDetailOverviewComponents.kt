package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.network.UrlResolver

@Composable
fun ClientInfoHeader(
    client: Client?,
    onPhoneClick: (String) -> Unit,
    onEmailClick: (String) -> Unit
) {
    if (client == null) return

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(name = client.name, photoUrl = UrlResolver.resolve(client.photoUrl), size = 48.dp)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = client.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = SolennixTheme.colors.primaryText,
                        fontWeight = FontWeight.Bold
                    )
                    val clientCity = client.city
                    if (clientCity != null) {
                        Text(
                            text = clientCity,
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onPhoneClick(client.phone) }
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Phone,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = client.phone,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.primary
                )
            }

            if (!client.email.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onEmailClick(client.email!!) }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Email,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = client.email!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primary
                    )
                }
            }
        }
    }
}

@Composable
fun EventInfoCard(
    event: Event,
    onStatusChange: (EventStatus) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                DateBox(event.eventDate)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = event.serviceType,
                        style = MaterialTheme.typography.titleLarge,
                        color = SolennixTheme.colors.primaryText,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    StatusChangePill(
                        currentStatus = event.status,
                        onStatusChange = onStatusChange
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            val timeText = buildString {
                event.startTime?.let { append(it) }
                event.endTime?.let {
                    if (isNotEmpty()) append(" - ")
                    append(it)
                }
            }
            val locationText = buildString {
                event.location?.takeIf { it.isNotEmpty() }?.let { append(it) }
                event.city?.takeIf { it.isNotEmpty() }?.let {
                    if (isNotEmpty()) append(", ")
                    append(it)
                }
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickInfoItem(
                    icon = Icons.Default.CalendarToday,
                    label = "Fecha",
                    value = event.eventDate,
                    modifier = Modifier.weight(1f)
                )
                if (timeText.isNotEmpty()) {
                    QuickInfoItem(
                        icon = Icons.Default.Schedule,
                        label = "Horario",
                        value = timeText,
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickInfoItem(
                    icon = Icons.Default.People,
                    label = "Personas",
                    value = "${event.numPeople} PAX",
                    modifier = Modifier.weight(1f)
                )
                if (locationText.isNotEmpty()) {
                    QuickInfoItem(
                        icon = Icons.Default.LocationOn,
                        label = "Ubicación",
                        value = locationText,
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }

            if (!event.notes.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Notas",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = event.notes!!,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.primaryText
                )
            }
        }
    }
}

@Composable
fun DateBox(dateString: String) {
    val parsed = try {
        java.time.LocalDate.parse(dateString)
    } catch (e: Exception) {
        null
    }
    val month = parsed?.format(
        java.time.format.DateTimeFormatter.ofPattern("MMM", java.util.Locale.forLanguageTag("es-ES"))
    )?.uppercase() ?: dateString.take(3).uppercase()
    val day = parsed?.dayOfMonth?.toString() ?: dateString.takeLast(2)

    Surface(
        shape = MaterialTheme.shapes.medium,
        color = SolennixTheme.colors.primary.copy(alpha = 0.12f),
        modifier = Modifier.size(64.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = month,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primary
            )
            Text(
                text = day,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primaryText
            )
        }
    }
}

@Composable
fun QuickInfoItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = SolennixTheme.colors.primary,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.tertiaryText
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
