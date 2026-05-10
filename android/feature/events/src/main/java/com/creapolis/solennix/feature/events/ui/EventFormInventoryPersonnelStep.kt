package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepInventoryAndPersonnel(viewModel: EventFormViewModel) {
    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
                .imePadding()
        ) {
            Spacer(modifier = Modifier.height(32.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(32.dp))
            EquipmentSection(viewModel)
            Spacer(modifier = Modifier.height(32.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(32.dp))
            StaffSection(viewModel)
        }
    }
}
