package com.creapolis.solennix.core.designsystem.util

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.runtime.compositionLocalOf

/**
 * CompositionLocal que provee el [SharedTransitionScope] creado por el SharedTransitionLayout
 * que envuelve el NavHost principal. Permite a pantallas profundas (EventListItem,
 * EventDetailScreen) acceder al scope sin necesidad de pasar el parámetro manualmente.
 *
 * Es null cuando el composable se llama fuera del NavHost (e.g., previews).
 */
@OptIn(ExperimentalSharedTransitionApi::class)
val LocalSharedTransitionScope = compositionLocalOf<SharedTransitionScope?> { null }

/**
 * CompositionLocal que provee el [AnimatedVisibilityScope] del bloque `composable { }`
 * activo en el NavHost. Se provee únicamente para las rutas que participan en la
 * transición compartida (events, event_detail).
 *
 * Es null cuando el composable se llama fuera del NavHost.
 */
val LocalNavAnimatedVisibilityScope = compositionLocalOf<AnimatedVisibilityScope?> { null }
