package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarColors
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SolennixSectionTopAppBar(
    title: String,
    navigationIcon: @Composable () -> Unit = {},
    onSearchClick: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    colors: TopAppBarColors = TopAppBarDefaults.topAppBarColors()
) {
    SolennixTopAppBar(
        title = { Text(title) },
        navigationIcon = navigationIcon,
        onSearchClick = onSearchClick,
        actions = actions,
        colors = colors
    )
}
