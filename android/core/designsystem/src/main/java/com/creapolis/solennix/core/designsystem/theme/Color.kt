package com.creapolis.solennix.core.designsystem.theme

import androidx.compose.ui.graphics.Color

// Brand
val SolennixGold = Color(0xFFC4A265)
val SolennixGoldDark = Color(0xFFB8965A)
val SolennixGoldDarkDM = Color(0xFFD4B87A)
val SolennixGoldLight = Color(0xFFF5F0E8)
val SolennixGoldLightDM = Color(0xFF1B2A4A)
val SolennixSecondary = Color(0xFF6B7B8D)
val SolennixSecondaryDM = Color(0xFF94A3B8)

// Status
val StatusQuoted = Color(0xFFD97706)
val StatusConfirmed = Color(0xFF007AFF)
val StatusCompleted = Color(0xFF2D6A4F)
val StatusCancelled = Color(0xFFFF3B30)

// KPI
val KPIBlue = Color(0xFF007AFF)
val KPIGreen = Color(0xFF34C759)
val KPIOrange = Color(0xFFD97706)
val KPIRed = Color(0xFFFF3B30)

// Avatar Palette
val AvatarPalette = listOf(
    Color(0xFFC4A265),
    Color(0xFF6B7B8D),
    Color(0xFF1976D2),
    Color(0xFF388E3C),
    Color(0xFFF57C00),
    Color(0xFF7B1FA2),
    Color(0xFFD32F2F),
    Color(0xFF455A64)
)

val LightSolennixColors = SolennixColorScheme(
    primary = SolennixGold,
    primaryDark = SolennixGoldDark,
    primaryLight = SolennixGoldLight,
    secondary = SolennixSecondary,
    background = Color(0xFFFFFFFF),
    surfaceGrouped = Color(0xFFF5F4F1),
    surface = Color(0xFFFAF9F7),
    surfaceAlt = Color(0xFFF0EFEC),
    card = Color(0xFFFFFFFF),
    primaryText = Color(0xFF1A1A1A),
    secondaryText = Color(0xFF7A7670),
    tertiaryText = Color(0xFFA09C96),
    inverseText = Color(0xFFFFFFFF),
    border = Color(0xFFE5E2DD),
    borderLight = Color(0xFFF0EFEC),
    divider = Color(0xFFE5E2DD),
    success = Color(0xFF2D6A4F),
    warning = Color(0xFFFF9500),
    error = Color(0xFFFF3B30),
    info = Color(0xFF007AFF),
    statusQuoted = StatusQuoted,
    statusConfirmed = StatusConfirmed,
    statusCompleted = StatusCompleted,
    statusCancelled = StatusCancelled,
    kpiBlue = KPIBlue,
    kpiGreen = KPIGreen,
    kpiOrange = KPIOrange,
    kpiRed = KPIRed,
    tabBarBg = Color(0xFFFFFFFF),
    tabBarActive = SolennixGold,
    tabBarInactive = Color(0xFF7A7670),
    avatarPalette = AvatarPalette
)

val DarkSolennixColors = SolennixColorScheme(
    primary = SolennixGold,
    primaryDark = SolennixGoldDarkDM,
    primaryLight = SolennixGoldLightDM,
    secondary = SolennixSecondaryDM,
    background = Color(0xFF000000),
    surfaceGrouped = Color(0xFF0A0F1A),
    surface = Color(0xFF1A2030),
    surfaceAlt = Color(0xFF252A35),
    card = Color(0xFF111722),
    primaryText = Color(0xFFF5F0E8),
    secondaryText = Color(0xFF9A9590),
    tertiaryText = Color(0xFF7A7670),
    inverseText = Color(0xFF000000),
    border = Color(0xFF2A3040),
    borderLight = Color(0xFF1A2030),
    divider = Color(0xFF2A3040),
    success = Color(0xFF30D158),
    warning = Color(0xFFFF9F0A),
    error = Color(0xFFFF453A),
    info = Color(0xFF0A84FF),
    statusQuoted = StatusQuoted,
    statusConfirmed = StatusConfirmed,
    statusCompleted = StatusCompleted,
    statusCancelled = StatusCancelled,
    kpiBlue = Color(0xFF0A84FF),
    kpiGreen = Color(0xFF30D158),
    kpiOrange = Color(0xFFFF9F0A),
    kpiRed = Color(0xFFFF453A),
    tabBarBg = Color(0xFF111722),
    tabBarActive = SolennixGold,
    tabBarInactive = Color(0xFF9A9590),
    avatarPalette = AvatarPalette
)
