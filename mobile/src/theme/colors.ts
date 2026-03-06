export const colors = {
    light: {
        // Brand (accent only — CTAs, FAB, active tab, links)
        primary: '#ff6b35',
        primaryDark: '#e55a2b',
        primaryLight: '#fff7ed',

        // Neutral palette (backbone of the UI)
        background: '#ffffff',
        surfaceGrouped: '#f2f2f7',   // iOS grouped background — default for authenticated screens
        surface: '#f9fafb',           // inputs, search bars, inactive chips
        surfaceAlt: '#f3f4f6',
        card: '#ffffff',              // card fill on top of surfaceGrouped

        // Text
        text: '#1c1c1e',              // iOS system label
        textSecondary: '#8e8e93',     // iOS secondary label
        textTertiary: '#aeaeb2',      // placeholders, muted icons
        textMuted: '#aeaeb2',         // alias
        textInverse: '#ffffff',

        // Borders & separators
        border: '#e5e7eb',
        borderStrong: '#d1d5db',
        separator: 'rgba(60, 60, 67, 0.29)',  // iOS hairline separator

        // Semantic (iOS system colors)
        success: '#34c759',
        warning: '#ff9500',
        error: '#ff3b30',
        info: '#007aff',

        // Semantic tinted backgrounds
        successBg: '#eefbf0',
        warningBg: '#fff8f0',
        errorBg: '#fff0f0',
        infoBg: '#eef4ff',

        // Event status
        statusQuoted: '#ff9500',
        statusConfirmed: '#007aff',
        statusCompleted: '#34c759',
        statusCancelled: '#ff3b30',

        // Event status backgrounds
        statusQuotedBg: '#fff8f0',
        statusConfirmedBg: '#eef4ff',
        statusCompletedBg: '#eefbf0',
        statusCancelledBg: '#fff0f0',

        // KPI icon colors (soft, muted)
        kpiGreen: '#34c759',
        kpiGreenBg: '#eefbf0',
        kpiOrange: '#ff9500',
        kpiOrangeBg: '#fff8f0',
        kpiBlue: '#007aff',
        kpiBlueBg: '#eef4ff',

        // Tab bar
        tabBar: {
            background: '#ffffff',
            active: '#ff6b35',
            inactive: '#aeaeb2',
        },
        tabBarBorder: '#e5e7eb',

        // Avatar palette (muted, lower saturation)
        avatarColors: [
            '#5B8DEF', '#E57373', '#81C784', '#FFB74D',
            '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65',
        ],
    },
    dark: {
        // Brand
        primary: '#ff6b35',
        primaryDark: '#ff8555',
        primaryLight: '#2a1a10',

        // Neutral palette
        background: '#000000',
        surfaceGrouped: '#000000',
        surface: '#2c2c2e',
        surfaceAlt: '#3a3a3c',
        card: '#1c1c1e',

        // Text
        text: '#f5f5f7',
        textSecondary: '#8e8e93',
        textTertiary: '#636366',
        textMuted: '#636366',
        textInverse: '#1c1c1e',

        // Borders & separators
        border: '#38383a',
        borderStrong: '#48484a',
        separator: 'rgba(84, 84, 88, 0.65)',

        // Semantic
        success: '#30d158',
        warning: '#ff9f0a',
        error: '#ff453a',
        info: '#0a84ff',

        // Semantic tinted backgrounds
        successBg: '#0d2818',
        warningBg: '#2a1a00',
        errorBg: '#2a0a0a',
        infoBg: '#001a33',

        // Event status
        statusQuoted: '#ff9f0a',
        statusConfirmed: '#0a84ff',
        statusCompleted: '#30d158',
        statusCancelled: '#ff453a',

        // Event status backgrounds
        statusQuotedBg: '#2a1a00',
        statusConfirmedBg: '#001a33',
        statusCompletedBg: '#0d2818',
        statusCancelledBg: '#2a0a0a',

        // KPI icon colors
        kpiGreen: '#30d158',
        kpiGreenBg: '#0d2818',
        kpiOrange: '#ff9f0a',
        kpiOrangeBg: '#2a1a00',
        kpiBlue: '#0a84ff',
        kpiBlueBg: '#001a33',

        // Tab bar
        tabBar: {
            background: '#1c1c1e',
            active: '#ff6b35',
            inactive: '#636366',
        },
        tabBarBorder: '#38383a',

        // Avatar palette
        avatarColors: [
            '#5B8DEF', '#E57373', '#81C784', '#FFB74D',
            '#BA68C8', '#F06292', '#4DB6AC', '#FF8A65',
        ],
    },
};

export type ColorScheme = keyof typeof colors;
export type ThemeColors = typeof colors.light;
