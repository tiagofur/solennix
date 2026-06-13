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

// Avatar brand-tonal tokens (replaces candy palette).
// Light: warm neutral background (#F0EFEC) + dark gold initials (#7A6133, ~5.3:1 AA).
// Dark: navy chip (#1B2738) + gold initials (#C4A265, ~5.8:1 AA).
val AvatarBackgroundLight = Color(0xFFF0EFEC)
val AvatarInitialsLight = Color(0xFF7A6133)
val AvatarBackgroundDark = Color(0xFF1B2738)
val AvatarInitialsDark = Color(0xFFC4A265)

// Tonal icon-square tokens (matching iOS iconSlate/iconTaupe/iconSage/iconSteel/iconPlum).
// Used for menu-row icon backgrounds with white glyphs.
// Contrast (white glyph): light / dark — all ≥ 3:1 WCAG 1.4.11 non-text.
val IconSlateLight = Color(0xFF3E5C82)     // Products — 6.87:1
val IconSlateDark = Color(0xFF5A7BA8)      // 4.34:1
val IconTaupeLight = Color(0xFF7A6A52)     // Inventory — 5.24:1
val IconTaupeDark = Color(0xFF9A8A72)      // 3.36:1
val IconSageLight = Color(0xFF4F6B5A)      // Form Links — 5.86:1
val IconSageDark = Color(0xFF6B8A78)       // 3.80:1
val IconSteelLight = Color(0xFF5C6B7A)     // Personnel — 5.47:1
val IconSteelDark = Color(0xFF7A8E9E)      // 3.39:1
val IconPlumLight = Color(0xFF6B5B7B)      // Reviews — 5.93:1
val IconPlumDark = Color(0xFF9A82B0)       // 3.47:1

val LightSolennixColors = SolennixColorScheme(
    primary = SolennixGold,
    primaryDark = SolennixGoldDark,
    primaryLight = SolennixGoldLight,
    secondary = SolennixSecondary,
    background = Color(0xFFF5F4F1),
    surfaceGrouped = Color(0xFFF5F4F1),
    surface = Color(0xFFFAF9F7),
    surfaceAlt = Color(0xFFF0EFEC),
    card = Color(0xFFFFFFFF),
    primaryText = Color(0xFF1A1A1A),
    secondaryText = Color(0xFF5F5852),
    tertiaryText = Color(0xFF756E67),
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
    tabBarInactive = Color(0xFF5F5852),
    avatarBackground = AvatarBackgroundLight,
    avatarInitials = AvatarInitialsLight,
    iconSlate = IconSlateLight,
    iconTaupe = IconTaupeLight,
    iconSage = IconSageLight,
    iconSteel = IconSteelLight,
    iconPlum = IconPlumLight
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
    secondaryText = Color(0xFFC7C0B8),
    tertiaryText = Color(0xFFA39D96),
    inverseText = Color(0xFF000000),
    border = Color(0xFF2A3040),
    borderLight = Color(0xFF1A2030),
    divider = Color(0xFF2A3040),
    success = Color(0xFF30D158),
    warning = Color(0xFFFF9F0A),
    error = Color(0xFFFF453A),
    info = Color(0xFF0A84FF),
    statusQuoted = Color(0xFFFF9F0A),
    statusConfirmed = Color(0xFF0A84FF),
    statusCompleted = Color(0xFF30D158),
    statusCancelled = Color(0xFFFF453A),
    kpiBlue = Color(0xFF0A84FF),
    kpiGreen = Color(0xFF30D158),
    kpiOrange = Color(0xFFFF9F0A),
    kpiRed = Color(0xFFFF453A),
    tabBarBg = Color(0xFF111722),
    tabBarActive = SolennixGold,
    tabBarInactive = Color(0xFFC7C0B8),
    avatarBackground = AvatarBackgroundDark,
    avatarInitials = AvatarInitialsDark,
    iconSlate = IconSlateDark,
    iconTaupe = IconTaupeDark,
    iconSage = IconSageDark,
    iconSteel = IconSteelDark,
    iconPlum = IconPlumDark
)
