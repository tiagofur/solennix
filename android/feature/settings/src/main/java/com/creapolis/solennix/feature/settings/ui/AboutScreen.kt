package com.creapolis.solennix.feature.settings.ui

import com.creapolis.solennix.feature.settings.R
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    val versionName = remember(context) {
        runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        }.getOrDefault("1.0.0") ?: "1.0.0"
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.settings_about_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(DesignSystemR.string.cd_back))
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 600.dp) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // App Icon placeholder
            Surface(
                modifier = Modifier.size(100.dp),
                shape = MaterialTheme.shapes.medium,
                color = SolennixTheme.colors.primary.copy(alpha = 0.1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "S",
                        style = MaterialTheme.typography.displayLarge,
                        color = SolennixTheme.colors.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Solennix",
                style = MaterialTheme.typography.headlineMedium,
                color = SolennixTheme.colors.primaryText
            )

            Text(
                text = stringResource(R.string.settings_about_version_value, versionName),
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText
            )

            Spacer(modifier = Modifier.height(32.dp))

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium,
                color = SolennixTheme.colors.card,
                tonalElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = stringResource(R.string.settings_about_description),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText,
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = stringResource(R.string.settings_about_developed_by),
                style = MaterialTheme.typography.labelLarge,
                color = SolennixTheme.colors.primary
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Creapolis",
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Links Section
            Text(
                text = stringResource(R.string.settings_about_links),
                style = MaterialTheme.typography.labelLarge,
                color = SolennixTheme.colors.primary,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium,
                color = SolennixTheme.colors.card,
                tonalElevation = 1.dp
            ) {
                Column {
                    ListItem(
                        headlineContent = { Text(stringResource(R.string.settings_about_website)) },
                        leadingContent = {
                            Icon(
                                Icons.Default.Language,
                                contentDescription = null,
                                tint = SolennixTheme.colors.primary
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                    HorizontalDivider(color = SolennixTheme.colors.divider.copy(alpha = 0.5f))

                    ListItem(
                        headlineContent = { Text(stringResource(R.string.settings_about_support)) },
                        leadingContent = {
                            Icon(
                                Icons.Default.Email,
                                contentDescription = null,
                                tint = SolennixTheme.colors.primary
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(modifier = Modifier.height(48.dp))

            Text(
                text = stringResource(R.string.settings_about_copyright),
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.tertiaryText,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
        }
    }
}
