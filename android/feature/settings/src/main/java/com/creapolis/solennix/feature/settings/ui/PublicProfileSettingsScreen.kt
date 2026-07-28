package com.creapolis.solennix.feature.settings.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
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
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.settings.R
import com.creapolis.solennix.feature.settings.viewmodel.PublicProfileSettingsViewModel

/**
 * Public professional profile settings.
 * Visual structure matches [EditProfileScreen] / [BusinessSettingsScreen]:
 * gold section labels + card Surfaces + SolennixTextField / PremiumButton.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicProfileSettingsScreen(
    viewModel: PublicProfileSettingsViewModel,
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    var contactMenuExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            snackbarHostState.showSnackbar(
                context.getString(R.string.settings_public_profile_saved)
            )
            viewModel.saveSuccess = false
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = {
                    Text(stringResource(R.string.settings_public_profile_title))
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = SolennixTheme.colors.surfaceGrouped
    ) { padding ->
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = SolennixTheme.colors.primary)
            }
        } else {
            AdaptiveCenteredContent(maxWidth = 700.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(scrollState)
                        .padding(16.dp)
                ) {
                    // ── General ──────────────────────────────────────────
                    SectionLabel(stringResource(R.string.settings_public_profile_title))
                    SettingsCard {
                        Text(
                            text = stringResource(R.string.settings_public_profile_description),
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.secondaryText
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        ToggleRow(
                            label = stringResource(R.string.settings_public_profile_enable),
                            checked = viewModel.isEnabled,
                            onCheckedChange = { viewModel.isEnabled = it }
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    // ── Slug + share ─────────────────────────────────────
                    SectionLabel(stringResource(R.string.settings_public_profile_slug))
                    SettingsCard {
                        SolennixTextField(
                            value = viewModel.slug,
                            onValueChange = viewModel::onSlugChange,
                            label = stringResource(R.string.settings_public_profile_slug),
                            placeholder = stringResource(
                                R.string.settings_public_profile_slug_placeholder
                            ),
                            errorMessage = viewModel.slugError,
                            modifier = Modifier.fillMaxWidth()
                        )

                        viewModel.shareUrl?.let { url ->
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = url,
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = {
                                        val clipboard = context.getSystemService(
                                            Context.CLIPBOARD_SERVICE
                                        ) as ClipboardManager
                                        clipboard.setPrimaryClip(
                                            ClipData.newPlainText("public profile", url)
                                        )
                                    }
                                ) {
                                    Icon(
                                        Icons.Default.ContentCopy,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(stringResource(R.string.settings_public_profile_copy))
                                }
                                OutlinedButton(
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, url)
                                        }
                                        context.startActivity(
                                            Intent.createChooser(
                                                intent,
                                                context.getString(
                                                    R.string.settings_public_profile_share
                                                )
                                            )
                                        )
                                    }
                                ) {
                                    Icon(
                                        Icons.Default.Share,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(stringResource(R.string.settings_public_profile_share))
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    // ── Headline ─────────────────────────────────────────
                    SectionLabel(stringResource(R.string.settings_public_profile_headline))
                    SettingsCard {
                        SolennixTextField(
                            value = viewModel.headline,
                            onValueChange = { viewModel.headline = it },
                            label = stringResource(R.string.settings_public_profile_headline),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    // ── Location ─────────────────────────────────────────
                    SectionLabel(stringResource(R.string.settings_public_profile_location))
                    SettingsCard {
                        AdaptiveFormRow(
                            left = {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    SolennixTextField(
                                        value = viewModel.city,
                                        onValueChange = { viewModel.city = it },
                                        label = stringResource(
                                            R.string.settings_public_profile_city
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    SolennixTextField(
                                        value = viewModel.region,
                                        onValueChange = { viewModel.region = it },
                                        label = stringResource(
                                            R.string.settings_public_profile_region
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            },
                            right = {
                                SolennixTextField(
                                    value = viewModel.country,
                                    onValueChange = { viewModel.country = it },
                                    label = stringResource(
                                        R.string.settings_public_profile_country
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    // ── Contact ──────────────────────────────────────────
                    SectionLabel(stringResource(R.string.settings_public_profile_contact))
                    SettingsCard {
                        ExposedDropdownMenuBox(
                            expanded = contactMenuExpanded,
                            onExpandedChange = { contactMenuExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = contactTypeLabel(viewModel.contactType),
                                onValueChange = {},
                                readOnly = true,
                                label = {
                                    Text(
                                        stringResource(
                                            R.string.settings_public_profile_contact_type
                                        )
                                    )
                                },
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(
                                        expanded = contactMenuExpanded
                                    )
                                },
                                shape = MaterialTheme.shapes.small,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = SolennixTheme.colors.primary,
                                    focusedLabelColor = SolennixTheme.colors.primary,
                                    cursorColor = SolennixTheme.colors.primary
                                ),
                                modifier = Modifier
                                    .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                                    .fillMaxWidth()
                            )
                            ExposedDropdownMenu(
                                expanded = contactMenuExpanded,
                                onDismissRequest = { contactMenuExpanded = false }
                            ) {
                                viewModel.contactTypes.forEach { type ->
                                    DropdownMenuItem(
                                        text = { Text(contactTypeLabel(type)) },
                                        onClick = {
                                            viewModel.contactType = type
                                            contactMenuExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        SolennixTextField(
                            value = viewModel.contactValue,
                            onValueChange = { viewModel.contactValue = it },
                            label = stringResource(
                                R.string.settings_public_profile_contact_value
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    // ── Visibility ───────────────────────────────────────
                    SectionLabel(stringResource(R.string.settings_public_profile_show_services))
                    SettingsCard {
                        ToggleRow(
                            label = stringResource(R.string.settings_public_profile_show_prices),
                            checked = viewModel.showPrices,
                            onCheckedChange = { viewModel.showPrices = it }
                        )
                        ToggleDivider()
                        ToggleRow(
                            label = stringResource(R.string.settings_public_profile_show_services),
                            checked = viewModel.showServices,
                            onCheckedChange = { viewModel.showServices = it }
                        )
                        ToggleDivider()
                        ToggleRow(
                            label = stringResource(R.string.settings_public_profile_show_contact),
                            checked = viewModel.showContact,
                            onCheckedChange = { viewModel.showContact = it }
                        )
                        ToggleDivider()
                        ToggleRow(
                            label = stringResource(R.string.settings_public_profile_show_reviews),
                            checked = if (viewModel.isPaid) viewModel.showReviews else false,
                            onCheckedChange = {
                                if (viewModel.isPaid) viewModel.showReviews = it
                            },
                            enabled = viewModel.isPaid,
                            locked = !viewModel.isPaid
                        )
                        ToggleDivider()
                        ToggleRow(
                            label = stringResource(R.string.settings_public_profile_show_portfolio),
                            checked = if (viewModel.isPaid) viewModel.showPortfolio else false,
                            onCheckedChange = {
                                if (viewModel.isPaid) viewModel.showPortfolio = it
                            },
                            enabled = viewModel.isPaid,
                            locked = !viewModel.isPaid
                        )
                    }

                    if (!viewModel.isPaid) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.medium,
                            color = SolennixTheme.colors.primaryLight
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(
                                    Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = SolennixTheme.colors.primary
                                )
                                Column {
                                    Text(
                                        text = stringResource(
                                            R.string.settings_public_profile_plan_required
                                        ),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    Text(
                                        text = stringResource(
                                            R.string.settings_public_profile_socials_pro_hint
                                        ),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    // ── Socials ──────────────────────────────────────────
                    SectionLabel(
                        title = stringResource(R.string.settings_public_profile_socials),
                        locked = !viewModel.isPaid
                    )
                    SettingsCard {
                        SolennixTextField(
                            value = if (viewModel.isPaid) viewModel.socialsText else "",
                            onValueChange = { viewModel.socialsText = it },
                            label = stringResource(R.string.settings_public_profile_socials),
                            placeholder = stringResource(
                                R.string.settings_public_profile_socials_placeholder
                            ),
                            enabled = viewModel.isPaid,
                            modifier = Modifier.fillMaxWidth()
                        )
                        if (!viewModel.isPaid) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = stringResource(
                                    R.string.settings_public_profile_socials_pro_hint
                                ),
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    // ── Portfolio ────────────────────────────────────────
                    SectionLabel(
                        title = stringResource(R.string.settings_public_profile_portfolio),
                        locked = !viewModel.isPaid
                    )
                    SettingsCard {
                        Text(
                            text = stringResource(
                                if (viewModel.isPaid) {
                                    R.string.settings_public_profile_portfolio_description
                                } else {
                                    R.string.settings_public_profile_portfolio_pro_hint
                                }
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )

                        if (viewModel.isPaid) {
                            Spacer(modifier = Modifier.height(12.dp))
                            when {
                                viewModel.portfolioLoading -> {
                                    Box(
                                        modifier = Modifier.fillMaxWidth(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(24.dp),
                                            color = SolennixTheme.colors.primary
                                        )
                                    }
                                }

                                viewModel.portfolio.isEmpty() -> {
                                    Text(
                                        text = stringResource(
                                            R.string.settings_public_profile_portfolio_empty
                                        ),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }

                                else -> {
                                    viewModel.portfolio.forEachIndexed { index, item ->
                                        if (index > 0) {
                                            ToggleDivider()
                                        }
                                        PortfolioItemRow(
                                            title = item.title,
                                            eventDate = item.eventDate,
                                            imageUrl = item.thumbnailUrl ?: item.photoUrl,
                                            onDelete = {
                                                viewModel.deletePortfolioItem(item.id)
                                            }
                                        )
                                    }
                                }
                            }

                            if (viewModel.portfolio.size <
                                PublicProfileSettingsViewModel.PORTFOLIO_MAX
                            ) {
                                Spacer(modifier = Modifier.height(12.dp))
                                SolennixTextField(
                                    value = viewModel.newPortfolioTitle,
                                    onValueChange = { viewModel.newPortfolioTitle = it },
                                    label = stringResource(
                                        R.string.settings_public_profile_portfolio_title
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                SolennixTextField(
                                    value = viewModel.newPortfolioPhotoUrl,
                                    onValueChange = { viewModel.newPortfolioPhotoUrl = it },
                                    label = stringResource(
                                        R.string.settings_public_profile_portfolio_photo_url
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                SolennixTextField(
                                    value = viewModel.newPortfolioEventDate,
                                    onValueChange = { viewModel.newPortfolioEventDate = it },
                                    label = stringResource(
                                        R.string.settings_public_profile_portfolio_event_date
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                PremiumButton(
                                    text = if (viewModel.isAddingPortfolio) {
                                        stringResource(
                                            R.string.settings_public_profile_portfolio_adding
                                        )
                                    } else {
                                        stringResource(
                                            R.string.settings_public_profile_portfolio_add
                                        )
                                    },
                                    onClick = { viewModel.addPortfolioItem() },
                                    enabled = !viewModel.isAddingPortfolio &&
                                        viewModel.newPortfolioTitle.isNotBlank() &&
                                        viewModel.newPortfolioPhotoUrl.isNotBlank(),
                                    isLoading = viewModel.isAddingPortfolio,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            } else {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = stringResource(
                                        R.string.settings_public_profile_portfolio_max
                                    ),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }

                            viewModel.portfolioError?.let {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = it,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.error
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    viewModel.errorMessage?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.error,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )
                    }

                    PremiumButton(
                        text = stringResource(R.string.settings_public_profile_save),
                        onClick = { viewModel.save() },
                        enabled = !viewModel.isSaving,
                        isLoading = viewModel.isSaving,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

// ── Shared layout pieces (match EditProfile / BusinessSettings) ──────────────

@Composable
private fun SectionLabel(title: String, locked: Boolean = false) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(bottom = 8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelLarge,
            color = SolennixTheme.colors.primary
        )
        if (locked) {
            Spacer(modifier = Modifier.width(6.dp))
            Icon(
                Icons.Default.Lock,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = SolennixTheme.colors.secondaryText
            )
        }
    }
}

@Composable
private fun SettingsCard(content: @Composable ColumnScope.() -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = SolennixTheme.colors.card,
        tonalElevation = 1.dp
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            content = content
        )
    }
}

@Composable
private fun ToggleDivider() {
    HorizontalDivider(
        modifier = Modifier.padding(vertical = 8.dp),
        color = SolennixTheme.colors.divider.copy(alpha = 0.5f)
    )
}

@Composable
private fun ToggleRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    enabled: Boolean = true,
    locked: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyLarge,
                color = if (enabled) {
                    SolennixTheme.colors.primaryText
                } else {
                    SolennixTheme.colors.secondaryText
                }
            )
            if (locked) {
                Spacer(modifier = Modifier.width(6.dp))
                Icon(
                    Icons.Default.Lock,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = SolennixTheme.colors.secondaryText
                )
            }
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedTrackColor = SolennixTheme.colors.primary,
                checkedThumbColor = SolennixTheme.colors.inverseText
            )
        )
    }
}

@Composable
private fun PortfolioItemRow(
    title: String,
    eventDate: String?,
    imageUrl: String?,
    onDelete: () -> Unit
) {
    val context = LocalContext.current
    val resolved = imageUrl?.let { UrlResolver.resolve(it) } ?: imageUrl
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data(resolved)
                .crossfade(true)
                .build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(8.dp))
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.primaryText
            )
            eventDate?.takeIf { it.isNotBlank() }?.let { date ->
                Text(
                    text = date,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
        IconButton(onClick = onDelete) {
            Icon(
                Icons.Default.Delete,
                contentDescription = stringResource(
                    R.string.settings_public_profile_portfolio_delete
                ),
                tint = SolennixTheme.colors.error
            )
        }
    }
}

@Composable
private fun contactTypeLabel(type: String): String = when (type) {
    "phone" -> stringResource(R.string.settings_public_profile_contact_phone)
    "whatsapp" -> stringResource(R.string.settings_public_profile_contact_whatsapp)
    "email" -> stringResource(R.string.settings_public_profile_contact_email)
    "url" -> stringResource(R.string.settings_public_profile_contact_url)
    else -> type
}
