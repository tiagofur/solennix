package com.creapolis.solennix.feature.staff.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.activity.compose.BackHandler
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.staff.R
import com.creapolis.solennix.feature.staff.viewmodel.StaffFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffFormScreen(
    viewModel: StaffFormViewModel,
    onSearchClick: () -> Unit = {},
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    var showDiscardDialog by remember { mutableStateOf(false) }

    // Back handler for dirty state
    BackHandler(enabled = viewModel.isDirty) {
        showDiscardDialog = true
    }

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            SolennixTopAppBar(
                title = {
                    Text(if (viewModel.isEditMode) stringResource(R.string.staff_form_title_edit) else stringResource(R.string.staff_form_title_create))
                },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = {
                        if (viewModel.isDirty) {
                            showDiscardDialog = true
                        } else {
                            onNavigateBack()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.staff_cd_back))
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            AdaptiveCenteredContent(maxWidth = 800.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom))
                        .verticalScroll(scrollState)
                        .padding(16.dp)
                ) {
                    // Form fields
                    AdaptiveFormRow(
                        left = {
                            SolennixTextField(
                                value = viewModel.name,
                                onValueChange = { viewModel.name = it },
                                label = stringResource(R.string.staff_form_name_label),
                                leadingIcon = Icons.Default.Person,
                                errorMessage = viewModel.nameError
                            )
                        },
                        right = {
                            SolennixTextField(
                                value = viewModel.roleLabel,
                                onValueChange = { viewModel.roleLabel = it },
                                label = stringResource(R.string.staff_form_role_label),
                                leadingIcon = Icons.Default.Badge
                            )
                        }
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    AdaptiveFormRow(
                        left = {
                            SolennixTextField(
                                value = viewModel.phone,
                                onValueChange = { viewModel.phone = it },
                                label = stringResource(R.string.staff_form_phone_label),
                                leadingIcon = Icons.Default.Phone,
                                keyboardType = KeyboardType.Phone
                            )
                        },
                        right = {
                            SolennixTextField(
                                value = viewModel.email,
                                onValueChange = { viewModel.email = it },
                                label = stringResource(R.string.staff_form_email_label),
                                leadingIcon = Icons.Default.Email,
                                keyboardType = KeyboardType.Email,
                                errorMessage = viewModel.emailError
                            )
                        }
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    SolennixTextField(
                        value = viewModel.notes,
                        onValueChange = { viewModel.notes = it },
                        label = stringResource(R.string.staff_form_notes_label),
                        leadingIcon = Icons.AutoMirrored.Filled.Notes
                    )
                    Spacer(modifier = Modifier.height(24.dp))

                    // Notification opt-in card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = SolennixTheme.colors.primaryLight.copy(alpha = 0.25f)
                        ),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    stringResource(R.string.staff_form_notification_title),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primaryText
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    stringResource(R.string.staff_form_notification_description),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Switch(
                                checked = viewModel.notificationEmailOptIn,
                                onCheckedChange = { viewModel.notificationEmailOptIn = it },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = SolennixTheme.colors.primary,
                                    checkedTrackColor = SolennixTheme.colors.primaryLight
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    if (viewModel.errorMessage != null) {
                        Text(
                            text = viewModel.errorMessage.orEmpty(),
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(bottom = 16.dp)
                        )
                    }

                    PremiumButton(
                        text = if (viewModel.isEditMode) stringResource(R.string.staff_form_save_changes) else stringResource(R.string.staff_form_create),
                        onClick = { viewModel.saveStaff() },
                        isLoading = viewModel.isSaving,
                        enabled = !viewModel.isSaving
                    )
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }

    if (showDiscardDialog) {
        AlertDialog(
            onDismissRequest = { showDiscardDialog = false },
            title = { Text(stringResource(R.string.staff_form_discard_title)) },
            text = { Text(stringResource(R.string.staff_form_discard_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDiscardDialog = false
                        onNavigateBack()
                    }
                ) {
                    Text(stringResource(R.string.staff_form_discard_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDiscardDialog = false }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}
