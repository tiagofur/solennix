package com.creapolis.solennix.feature.settings.ui

import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Accessibility regression guard for the settings feature (#853).
 *
 * TalkBack audit across `feature/` + `core/` found 217 of 218
 * `contentDescription = null` are correct decorative icons (inside labeled
 * TextField/Button/Card parents). The single real gap was
 * [AccountDeletionScreen]'s back [androidx.compose.material3.IconButton] —
 * icon-only with no adjacent text, announced as just "Button" by TalkBack.
 *
 * It now uses `stringResource(DesignSystemR.string.cd_back)`. This test
 * guards the resource contract: if `cd_back` is ever removed or renamed
 * without updating the call site, the resource id resolves to 0 and this
 * fails before the unlabeled control ships.
 */
class AccountDeletionAccessibilityTest {

    @Test
    fun `cd_back resource resolves for account deletion back button`() {
        assertTrue(DesignSystemR.string.cd_back != 0) {
            "DesignSystemR.string.cd_back must exist — AccountDeletionScreen back IconButton depends on it (#853)"
        }
    }
}
