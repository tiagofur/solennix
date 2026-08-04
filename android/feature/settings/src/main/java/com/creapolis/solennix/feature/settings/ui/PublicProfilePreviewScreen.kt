package com.creapolis.solennix.feature.settings.ui

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.PublicContact
import com.creapolis.solennix.core.model.PublicOrganizerProfile
import com.creapolis.solennix.core.model.PublicPackage
import com.creapolis.solennix.core.model.PublicPortfolioItem
import com.creapolis.solennix.core.model.PublicProfileService
import com.creapolis.solennix.core.model.PublicReview
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.settings.R
import com.creapolis.solennix.feature.settings.viewmodel.PublicProfilePreviewViewModel

/**
 * Provider preview of the public profile page (#1126).
 * Loads `GET /public/organizers/{slug}` and mirrors plan-aware sections.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicProfilePreviewScreen(
    viewModel: PublicProfilePreviewViewModel,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val title = state.profile?.displayName
        ?: stringResource(R.string.settings_public_profile_preview_title)

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.settings_public_profile_preview_back)
                        )
                    }
                },
                actions = {
                    val profile = state.profile
                    if (profile != null) {
                        IconButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, profile.publicUrl)
                                }
                                context.startActivity(
                                    Intent.createChooser(
                                        intent,
                                        context.getString(R.string.settings_public_profile_share)
                                    )
                                )
                            }
                        ) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = stringResource(R.string.settings_public_profile_share)
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading && state.profile == null -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                state.notFound -> {
                    EmptyState(
                        title = stringResource(R.string.settings_public_profile_preview_not_found_title),
                        message = stringResource(R.string.settings_public_profile_preview_not_found_message),
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                state.errorMessage != null && state.profile == null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = stringResource(R.string.settings_public_profile_preview_error_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = state.errorMessage
                                ?: stringResource(R.string.settings_public_profile_preview_error),
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.secondaryText
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        TextButton(onClick = viewModel::load) {
                            Text(stringResource(R.string.settings_public_profile_preview_retry))
                        }
                    }
                }
                state.profile != null -> {
                    ProfileContent(profile = state.profile!!)
                }
                else -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
            }
        }
    }
}

@Composable
private fun EmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText
        )
    }
}

@Composable
private fun ProfileContent(profile: PublicOrganizerProfile) {
    val context = LocalContext.current
    val brand = parseBrandColor(profile.brandColor) ?: SolennixTheme.colors.primary
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .background(SolennixTheme.colors.surfaceGrouped)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
        ) {
            val cover = profile.coverUrl?.let { UrlResolver.resolve(it) }
            if (cover != null) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(cover)
                        .crossfade(true)
                        .build(),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(brand.copy(alpha = 0.35f))
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.55f))
                        )
                    )
            )
            Row(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val logo = profile.logoUrl?.let { UrlResolver.resolve(it) }
                if (logo != null) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(logo)
                            .crossfade(true)
                            .build(),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(14.dp))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                }
                Column {
                    Text(
                        text = profile.displayName,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    val rating = profile.averageRating
                    val count = profile.reviewsCount
                    if (rating != null && count != null) {
                        Text(
                            text = "★ %.1f · %d".format(rating, count),
                            style = MaterialTheme.typography.labelMedium,
                            color = Color.White.copy(alpha = 0.95f)
                        )
                    }
                }
            }
        }

        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            profile.headline?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            StatsRow(profile)

            profile.about?.takeIf { it.isNotBlank() }?.let {
                SectionBlock(
                    title = stringResource(R.string.settings_public_profile_preview_about),
                    body = it
                )
            }

            profile.serviceAreas?.takeIf { it.isNotEmpty() }?.let {
                ChipsSection(
                    title = stringResource(R.string.settings_public_profile_preview_areas),
                    items = it
                )
            }

            profile.eventTypes?.takeIf { it.isNotEmpty() }?.let {
                ChipsSection(
                    title = stringResource(R.string.settings_public_profile_preview_events),
                    items = it
                )
            }

            profile.services?.takeIf { it.isNotEmpty() }?.let {
                ServicesSection(it, showPrices = it.any { s -> s.basePrice != null })
            }

            profile.packages?.takeIf { it.isNotEmpty() }?.let {
                PackagesSection(it)
            }

            profile.portfolio?.takeIf { it.isNotEmpty() }?.let {
                PortfolioSection(it)
            }

            profile.reviews?.takeIf { it.isNotEmpty() }?.let {
                ReviewsSection(it, profile.averageRating, profile.reviewsCount)
            }

            profile.contact?.let { ContactSection(it) }

            profile.socials?.takeIf { it.isNotEmpty() }?.let { socials ->
                ChipsSection(
                    title = stringResource(R.string.settings_public_profile_preview_socials),
                    items = socials.map { "${it.key}: ${it.value}" }
                )
            }

            profile.location?.formatted?.takeIf { it.isNotBlank() }?.let {
                SectionBlock(
                    title = stringResource(R.string.settings_public_profile_preview_location),
                    body = it
                )
            }

            Text(
                text = profile.publicUrl,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun StatsRow(profile: PublicOrganizerProfile) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatChip(
            label = stringResource(R.string.settings_public_profile_preview_completed),
            value = profile.eventsCompleted.toString(),
            modifier = Modifier.weight(1f)
        )
        profile.responseTime?.takeIf { it.isNotBlank() }?.let {
            StatChip(
                label = stringResource(R.string.settings_public_profile_preview_response),
                value = it,
                modifier = Modifier.weight(1f)
            )
        }
        if (profile.minGuests != null && profile.maxGuests != null) {
            StatChip(
                label = stringResource(R.string.settings_public_profile_preview_capacity),
                value = "${profile.minGuests}-${profile.maxGuests}",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun StatChip(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = SolennixTheme.colors.surfaceAlt
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(text = value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText
            )
        }
    }
}

@Composable
private fun SectionBlock(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText
        )
    }
}

@Composable
private fun ChipsSection(title: String, items: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(text = title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items.forEach { item ->
                Surface(
                    shape = RoundedCornerShape(50),
                    color = SolennixTheme.colors.surfaceAlt
                ) {
                    Text(
                        text = item,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun ServicesSection(services: List<PublicProfileService>, showPrices: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = stringResource(R.string.settings_public_profile_preview_services),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        services.forEach { service ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = service.name, style = MaterialTheme.typography.bodyMedium)
                if (service.isFeatured) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        Icons.Default.Star,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(14.dp)
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                if (showPrices && service.basePrice != null) {
                    Text(
                        text = "%.0f".format(service.basePrice),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun PackagesSection(packages: List<PublicPackage>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = stringResource(R.string.settings_public_profile_preview_packages),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        packages.forEach { pkg ->
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(text = pkg.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                pkg.description?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                pkg.fromPrice?.let {
                    Text(
                        text = stringResource(R.string.settings_public_profile_preview_from_price, it.toInt()),
                        style = MaterialTheme.typography.labelMedium,
                        color = SolennixTheme.colors.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun PortfolioSection(items: List<PublicPortfolioItem>) {
    val context = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = stringResource(R.string.settings_public_profile_preview_portfolio),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items.forEach { item ->
                Column(modifier = Modifier.width(140.dp)) {
                    val url = UrlResolver.resolve(item.thumbnailUrl ?: item.photoUrl)
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(url)
                            .crossfade(true)
                            .build(),
                        contentDescription = item.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp)
                            .clip(RoundedCornerShape(12.dp))
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.labelSmall,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
private fun ReviewsSection(
    reviews: List<PublicReview>,
    average: Double?,
    count: Int?
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = stringResource(R.string.settings_public_profile_preview_reviews),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            if (average != null && count != null) {
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "★ %.1f (%d)".format(average, count),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
        reviews.take(5).forEach { review ->
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row {
                    Text(
                        text = review.displayName,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "★".repeat(review.rating.coerceIn(0, 5)),
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.primary
                    )
                }
                review.comment?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun ContactSection(contact: PublicContact) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = stringResource(R.string.settings_public_profile_preview_contact),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "${contact.type}: ${contact.value}",
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

private fun parseBrandColor(hex: String?): Color? {
    if (hex.isNullOrBlank()) return null
    val cleaned = hex.trim().removePrefix("#")
    if (cleaned.length != 6) return null
    return try {
        Color(android.graphics.Color.parseColor("#$cleaned"))
    } catch (_: IllegalArgumentException) {
        null
    }
}

