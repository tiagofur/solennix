package com.creapolis.solennix.feature.settings.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.settings.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TermsScreen(
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.settings_terms_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.settings_terms_back))
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
                text = stringResource(R.string.settings_terms_last_updated),
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_1_title),
                content = stringResource(R.string.settings_terms_section_1_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_2_title),
                content = stringResource(R.string.settings_terms_section_2_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_3_title),
                content = stringResource(R.string.settings_terms_section_3_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_4_title),
                content = stringResource(R.string.settings_terms_section_4_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_5_title),
                content = stringResource(R.string.settings_terms_section_5_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_6_title),
                content = stringResource(R.string.settings_terms_section_6_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_7_title),
                content = stringResource(R.string.settings_terms_section_7_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_8_title),
                content = stringResource(R.string.settings_terms_section_8_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_9_title),
                content = stringResource(R.string.settings_terms_section_9_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_10_title),
                content = stringResource(R.string.settings_terms_section_10_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_11_title),
                content = stringResource(R.string.settings_terms_section_11_content)
            )

            TermsSection(
                title = stringResource(R.string.settings_terms_section_12_title),
                content = stringResource(R.string.settings_terms_section_12_content)
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
        }
    }
}

@Composable
private fun TermsSection(title: String, content: String) {
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
