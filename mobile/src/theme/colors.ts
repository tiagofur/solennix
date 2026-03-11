export const colors = {
  light: {
    // Brand (accent only — CTAs, FAB, active tab, links)
    primary: "#C4A265",
    primaryDark: "#B8965A",
    primaryLight: "#F5F0E8",
    secondary: "#6B7B8D",

    // Warm neutral palette (backbone of the UI)
    background: "#ffffff",
    surfaceGrouped: "#F5F4F1", // Warm cream-tinted grouped background
    surface: "#FAF9F7", // inputs, search bars, inactive chips
    surfaceAlt: "#F0EFEC",
    card: "#ffffff", // card fill on top of surfaceGrouped

    // Text (warm tones)
    text: "#1A1A1A",
    textSecondary: "#7A7670",
    textTertiary: "#A8A29E",
    textMuted: "#A8A29E", // alias
    textInverse: "#ffffff",

    // Borders & separators (warm)
    border: "#E6E3DD",
    borderStrong: "#D4D0C8",
    separator: "rgba(60, 60, 67, 0.29)", // iOS hairline separator

    // Semantic (iOS system colors)
    success: "#2D6A4F", // Muted Sage/Forest Green
    warning: "#ff9500",
    error: "#ff3b30",
    info: "#007aff",

    // Semantic tinted backgrounds
    successBg: "#F0F7F4", // Very soft sage tint
    warningBg: "#fff8f0",
    errorBg: "#fff0f0",
    infoBg: "#eef4ff",

    // Event status
    statusQuoted: "#d97706", // Amber 600 (more solemn/gold than bright orange)
    statusConfirmed: "#007aff",
    statusCompleted: "#2D6A4F",
    statusCancelled: "#ff3b30",

    // Event status backgrounds
    statusQuotedBg: "#fff8f0",
    statusConfirmedBg: "#eef4ff",
    statusCompletedBg: "#F0F7F4",
    statusCancelledBg: "#fff0f0",

    // KPI icon colors (soft, muted)
    kpiGreen: "#34c759",
    kpiGreenBg: "#eefbf0",
    kpiOrange: "#d97706",
    kpiOrangeBg: "#fff8f0",
    kpiBlue: "#007aff",
    kpiBlueBg: "#eef4ff",

    // Tab bar
    tabBar: {
      background: "#ffffff",
      active: "#C4A265",
      inactive: "#A8A29E",
    },
    tabBarBorder: "#E6E3DD",

    // Avatar palette (muted, professional tones)
    avatarColors: [
      "#5B8DEF", // Blue
      "#E57373", // Soft Red
      "#7DB38A", // Muted Sage
      "#D4B87A", // Soft Gold
      "#BA68C8", // Purple
      "#F06292", // Pink
      "#4DB6AC", // Teal
      "#FF8A65", // Terracotta
    ],
  },
  dark: {
    // Brand
    primary: "#C4A265",
    primaryDark: "#D4B87A",
    primaryLight: "#1B2A4A",
    secondary: "#94a3b8",

    // Navy-tinted dark palette
    background: "#000000",
    surfaceGrouped: "#0A0F1A", // Subtle navy tint
    surface: "#1A2030", // Navy-tinted surface
    surfaceAlt: "#252A35",
    card: "#111722", // Navy-tinted cards

    // Warm cream text
    text: "#F5F0E8", // Brand crema
    textSecondary: "#9A9590",
    textTertiary: "#6B6560",
    textMuted: "#6B6560",
    textInverse: "#1A1A1A",

    // Navy-tinted borders
    border: "#252A35",
    borderStrong: "#3A3F4A",
    separator: "rgba(84, 84, 88, 0.65)",

    // Semantic
    success: "#52B788", // More visible soft green for dark mode
    warning: "#ff9f0a",
    error: "#ff453a",
    info: "#0a84ff",

    // Semantic tinted backgrounds
    successBg: "#0B1D14",
    warningBg: "#2a1a00",
    errorBg: "#2a0a0a",
    infoBg: "#001a33",

    // Event status
    statusQuoted: "#fbbf24", // Amber 400 for dark mode
    statusConfirmed: "#0a84ff",
    statusCompleted: "#52B788",
    statusCancelled: "#ff453a",

    // Event status backgrounds
    statusQuotedBg: "#2a1a00",
    statusConfirmedBg: "#001a33",
    statusCompletedBg: "#0B1D14",
    statusCancelledBg: "#2a0a0a",

    // KPI icon colors
    kpiGreen: "#30d158",
    kpiGreenBg: "#0d2818",
    kpiOrange: "#fbbf24",
    kpiOrangeBg: "#2a1a00",
    kpiBlue: "#0a84ff",
    kpiBlueBg: "#001a33",

    // Tab bar
    tabBar: {
      background: "#111722",
      active: "#C4A265",
      inactive: "#6B6560",
    },
    tabBarBorder: "#252A35",

    // Avatar palette
    avatarColors: [
      "#5B8DEF",
      "#E57373",
      "#7DB38A",
      "#D4B87A",
      "#BA68C8",
      "#F06292",
      "#4DB6AC",
      "#FF8A65",
    ],
  },
};

export type ColorScheme = keyof typeof colors;
export type ThemeColors = typeof colors.light;
