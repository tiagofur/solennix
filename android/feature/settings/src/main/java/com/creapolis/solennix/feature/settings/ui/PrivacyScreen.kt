package com.creapolis.solennix.feature.settings.ui

import com.creapolis.solennix.feature.settings.R
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacyScreen(
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    val uriHandler = LocalUriHandler.current

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.settings_privacy_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(DesignSystemR.string.cd_back))
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(maxWidth = 700.dp) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.settings_privacy_last_updated),
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_1_title),
                content = stringResource(R.string.settings_privacy_section_1_content)
            )

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_2_title),
                content = stringResource(R.string.settings_privacy_section_2_content)
            )

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_3_title),
                content = stringResource(R.string.settings_privacy_section_3_content)
            )

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_4_title),
                content = stringResource(R.string.settings_privacy_section_4_content)
            )

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_5_title),
                content = stringResource(R.string.settings_privacy_section_5_content)
            )

            TextButton(
                onClick = { uriHandler.openUri("https://creapolis.dev/delete-account") },
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Text(stringResource(R.string.settings_privacy_delete_account_cta), color = SolennixTheme.colors.primary)
            }

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_6_title),
                content = stringResource(R.string.settings_privacy_section_6_content)
            )

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_7_title),
                content = stringResource(R.string.settings_privacy_section_7_content)
            )

            PolicySection(
                title = stringResource(R.string.settings_privacy_section_8_title),
                content = stringResource(R.string.settings_privacy_section_8_content)
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
        }
    }
}

@Composable
private fun PolicySection(title: String, content: String) {
    Column(modifier = Modifier.padding(bottom = 20.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            text = content,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText,
            lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.4
        )
    }
}
