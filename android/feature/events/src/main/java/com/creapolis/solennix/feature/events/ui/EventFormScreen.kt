package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.event.UiEventSnackbarHandler
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.*
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel
import com.creapolis.solennix.feature.events.viewmodel.SelectedStaffAssignment
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.UUID
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventFormScreen(
    viewModel: EventFormViewModel,
    onSearchClick: () -> Unit = {},
    onNavigateBack: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { 5 })
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    UiEventSnackbarHandler(
        events = viewModel.uiEvents,
        snackbarHostState = snackbarHostState,
    )

    // Inventario & Personal (page 3) carga ambos sets de sugerencias porque
    // ahora vive todo junto en un solo paso.
    LaunchedEffect(pagerState.currentPage) {
        if (pagerState.currentPage == 3) {
            viewModel.fetchEquipmentSuggestions()
            viewModel.fetchSupplySuggestions()
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(if (viewModel.isEditMode) R.string.events_form_title_edit else R.string.events_form_title_new)) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_form_back))
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        val loadError = viewModel.loadError
        when {
            loadError != null -> {
                EventLoadErrorCard(
                    message = loadError,
                    onRetry = { viewModel.retryLoad() },
                    onNavigateBack = onNavigateBack,
                    modifier = Modifier.padding(padding),
                )
            }
            else -> {
                Column(modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .navigationBarsPadding()
                    .imePadding()
                ) {
                    EventFormStepIndicator(
                        currentPage = pagerState.currentPage,
                        onStepClick = { target ->
                            if (target < pagerState.currentPage) {
                                scope.launch { pagerState.animateScrollToPage(target) }
                            }
                        },
                    )

                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier.weight(1f),
                        userScrollEnabled = false
                    ) { page ->
                        when (page) {
                            0 -> StepGeneralInfo(viewModel)
                            1 -> StepProducts(viewModel)
                            2 -> StepExtras(viewModel)
                            3 -> StepInventoryAndPersonnel(viewModel)
                            4 -> StepSummary(viewModel, isEditMode = viewModel.isEditMode)
                        }
                    }

                    // Bottom step navigation — inside Column so IME insets are respected
                    if (viewModel.loadError == null) {
                        BottomStepNavigation(
                            currentPage = pagerState.currentPage,
                            totalPages = 5,
                            onNext = {
                                val error = viewModel.validateStep(pagerState.currentPage)
                                if (error != null) {
                                    viewModel.saveError = error
                                } else if (pagerState.currentPage < 4) {
                                    scope.launch {
                                        pagerState.animateScrollToPage(pagerState.currentPage + 1)
                                    }
                                } else {
                                    viewModel.saveEvent()
                                }
                            },
                            onBack = {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage - 1)
                                }
                            },
                            isLoading = viewModel.isLoading,
                            isEditMode = viewModel.isEditMode
                        )
                    }
                }
            }
        }
    }

    if (viewModel.saveSuccess) {
        LaunchedEffect(Unit) { onNavigateBack() }
    }

    viewModel.saveError?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.saveError = null },
            title = { Text(stringResource(R.string.events_form_error_title)) },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { viewModel.saveError = null }) {
                    Text(stringResource(R.string.events_form_ok))
                }
            }
        )
    }

    viewModel.planLimitMessage?.let { message ->
        UpgradePlanDialog(
            message = message,
            onUpgradeClick = {
                viewModel.planLimitMessage = null
                onNavigateBack()
            },
            onDismiss = { viewModel.planLimitMessage = null }
        )
    }
}
