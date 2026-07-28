package com.creapolis.solennix.feature.settings.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.R
import com.creapolis.solennix.feature.settings.viewmodel.PublicProfileSettingsViewModel

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
        snackbarHost = { SnackbarHost(snackbarHostState) }
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
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = stringResource(R.string.settings_public_profile_description),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )

                    ToggleRow(
                        label = stringResource(R.string.settings_public_profile_enable),
                        checked = viewModel.isEnabled,
                        onCheckedChange = { viewModel.isEnabled = it }
                    )

                    SolennixTextField(
                        value = viewModel.slug,
                        onValueChange = viewModel::onSlugChange,
                        label = stringResource(R.string.settings_public_profile_slug),
                        placeholder = stringResource(R.string.settings_public_profile_slug_placeholder),
                        errorMessage = viewModel.slugError,
                        modifier = Modifier.fillMaxWidth()
                    )

                    viewModel.shareUrl?.let { url ->
                        Text(
                            text = url,
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(onClick = {
                                val clipboard =
                                    context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(
                                    ClipData.newPlainText("public profile", url)
                                )
                            }) {
                                Text(stringResource(R.string.settings_public_profile_copy))
                            }
                            TextButton(onClick = {
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, url)
                                }
                                context.startActivity(
                                    Intent.createChooser(
                                        intent,
                                        context.getString(R.string.settings_public_profile_share)
                                    )
                                )
                            }) {
                                Icon(Icons.Default.Share, contentDescription = null)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(stringResource(R.string.settings_public_profile_share))
                            }
                        }
                    }

                    SolennixTextField(
                        value = viewModel.headline,
                        onValueChange = { viewModel.headline = it },
                        label = stringResource(R.string.settings_public_profile_headline),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text(
                        text = stringResource(R.string.settings_public_profile_location),
                        style = MaterialTheme.typography.titleSmall,
                        color = SolennixTheme.colors.primaryText
                    )
                    SolennixTextField(
                        value = viewModel.city,
                        onValueChange = { viewModel.city = it },
                        label = stringResource(R.string.settings_public_profile_city),
                        modifier = Modifier.fillMaxWidth()
                    )
                    SolennixTextField(
                        value = viewModel.region,
                        onValueChange = { viewModel.region = it },
                        label = stringResource(R.string.settings_public_profile_region),
                        modifier = Modifier.fillMaxWidth()
                    )
                    SolennixTextField(
                        value = viewModel.country,
                        onValueChange = { viewModel.country = it },
                        label = stringResource(R.string.settings_public_profile_country),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text(
                        text = stringResource(R.string.settings_public_profile_contact),
                        style = MaterialTheme.typography.titleSmall,
                        color = SolennixTheme.colors.primaryText
                    )
                    ExposedDropdownMenuBox(
                        expanded = contactMenuExpanded,
                        onExpandedChange = { contactMenuExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = contactTypeLabel(viewModel.contactType),
                            onValueChange = {},
                            readOnly = true,
                            label = {
                                Text(stringResource(R.string.settings_public_profile_contact_type))
                            },
                            trailingIcon = {
                                ExposedDropdownMenuDefaults.TrailingIcon(
                                    expanded = contactMenuExpanded
                                )
                            },
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
                    SolennixTextField(
                        value = viewModel.contactValue,
                        onValueChange = { viewModel.contactValue = it },
                        label = stringResource(R.string.settings_public_profile_contact_value),
                        modifier = Modifier.fillMaxWidth()
                    )

                    ToggleRow(
                        label = stringResource(R.string.settings_public_profile_show_prices),
                        checked = viewModel.showPrices,
                        onCheckedChange = { viewModel.showPrices = it }
                    )
                    ToggleRow(
                        label = stringResource(R.string.settings_public_profile_show_services),
                        checked = viewModel.showServices,
                        onCheckedChange = { viewModel.showServices = it }
                    )
                    ToggleRow(
                        label = stringResource(R.string.settings_public_profile_show_contact),
                        checked = viewModel.showContact,
                        onCheckedChange = { viewModel.showContact = it }
                    )
                    ToggleRow(
                        label = stringResource(R.string.settings_public_profile_show_reviews),
                        checked = if (viewModel.isPaid) viewModel.showReviews else false,
                        onCheckedChange = { if (viewModel.isPaid) viewModel.showReviews = it },
                        enabled = viewModel.isPaid,
                        locked = !viewModel.isPaid
                    )
                    ToggleRow(
                        label = stringResource(R.string.settings_public_profile_show_portfolio),
                        checked = if (viewModel.isPaid) viewModel.showPortfolio else false,
                        onCheckedChange = { if (viewModel.isPaid) viewModel.showPortfolio = it },
                        enabled = viewModel.isPaid,
                        locked = !viewModel.isPaid
                    )

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
                        Text(
                            text = stringResource(R.string.settings_public_profile_socials_pro_hint),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = stringResource(R.string.settings_public_profile_portfolio),
                            style = MaterialTheme.typography.titleSmall,
                            color = SolennixTheme.colors.primaryText
                        )
                        if (!viewModel.isPaid) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                Icons.Default.Lock,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
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
                        if (viewModel.portfolioLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = SolennixTheme.colors.primary
                            )
                        } else if (viewModel.portfolio.isEmpty()) {
                            Text(
                                text = stringResource(
                                    R.string.settings_public_profile_portfolio_empty
                                ),
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        } else {
                            viewModel.portfolio.forEach { item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    AsyncImage(
                                        model = ImageRequest.Builder(context)
                                            .data(item.thumbnailUrl ?: item.photoUrl)
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
                                            text = item.title,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = SolennixTheme.colors.primaryText
                                        )
                                        item.eventDate?.takeIf { it.isNotBlank() }?.let { date ->
                                            Text(
                                                text = date,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SolennixTheme.colors.secondaryText
                                            )
                                        }
                                    }
                                    IconButton(
                                        onClick = { viewModel.deletePortfolioItem(item.id) }
                                    ) {
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
                        }

                        if (viewModel.portfolio.size < PublicProfileSettingsViewModel.PORTFOLIO_MAX) {
                            SolennixTextField(
                                value = viewModel.newPortfolioTitle,
                                onValueChange = { viewModel.newPortfolioTitle = it },
                                label = stringResource(
                                    R.string.settings_public_profile_portfolio_title
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                            SolennixTextField(
                                value = viewModel.newPortfolioPhotoUrl,
                                onValueChange = { viewModel.newPortfolioPhotoUrl = it },
                                label = stringResource(
                                    R.string.settings_public_profile_portfolio_photo_url
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                            SolennixTextField(
                                value = viewModel.newPortfolioEventDate,
                                onValueChange = { viewModel.newPortfolioEventDate = it },
                                label = stringResource(
                                    R.string.settings_public_profile_portfolio_event_date
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                            PremiumButton(
                                text = if (viewModel.isAddingPortfolio) {
                                    stringResource(
                                        R.string.settings_public_profile_portfolio_adding
                                    )
                                } else {
                                    stringResource(R.string.settings_public_profile_portfolio_add)
                                },
                                onClick = { viewModel.addPortfolioItem() },
                                enabled = !viewModel.isAddingPortfolio &&
                                    viewModel.newPortfolioTitle.isNotBlank() &&
                                    viewModel.newPortfolioPhotoUrl.isNotBlank(),
                                isLoading = viewModel.isAddingPortfolio,
                                modifier = Modifier.fillMaxWidth()
                            )
                        } else {
                            Text(
                                text = stringResource(
                                    R.string.settings_public_profile_portfolio_max
                                ),
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }

                        viewModel.portfolioError?.let {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.error
                            )
                        }
                    }

                    viewModel.errorMessage?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.error
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
                color = SolennixTheme.colors.primaryText
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
                checkedThumbColor = SolennixTheme.colors.primary,
                checkedTrackColor = SolennixTheme.colors.primaryLight
            )
        )
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
