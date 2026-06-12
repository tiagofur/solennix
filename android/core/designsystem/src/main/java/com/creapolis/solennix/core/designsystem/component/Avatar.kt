package com.creapolis.solennix.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme

/**
 * User/client avatar with photo or brand-tonal initials fallback.
 *
 * The initials treatment is consistent app-wide (matching iOS brand tonal):
 * - Background: `avatarBackground` (warm neutral in light, navy chip in dark)
 * - Initials: `avatarInitials` (gold tones, ≥4.5:1 contrast on both backgrounds)
 */
@Composable
fun Avatar(
    name: String,
    photoUrl: String? = null,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(SolennixTheme.colors.avatarBackground),
        contentAlignment = Alignment.Center
    ) {
        if (photoUrl != null) {
            AsyncImage(
                model = photoUrl,
                contentDescription = name,
                modifier = Modifier.size(size),
                contentScale = ContentScale.Crop
            )
        } else {
            Text(
                text = getInitials(name),
                color = SolennixTheme.colors.avatarInitials,
                fontSize = (size.value * 0.4).sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

private fun getInitials(name: String): String {
    val parts = name.split(" ").filter { it.isNotBlank() }
    return when {
        parts.isEmpty() -> "?"
        parts.size == 1 -> parts[0].first().uppercase()
        else -> parts[0].first().uppercase() + parts.last().first().uppercase()
    }
}
