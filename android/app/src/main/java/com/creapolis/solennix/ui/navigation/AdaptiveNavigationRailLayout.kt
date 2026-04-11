package com.creapolis.solennix.ui.navigation

import androidx.compose.runtime.Composable
import com.creapolis.solennix.core.model.User

@Composable
fun AdaptiveNavigationRailLayout(
    initialDeepLinkRoute: String? = null,
    currentUser: User? = null
) {
    // Temporary stable fallback: reuse compact navigation until adaptive rail is rebuilt.
    CompactBottomNavLayout(initialDeepLinkRoute = initialDeepLinkRoute)
}
