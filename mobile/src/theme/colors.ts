export const colors = {
    light: {
        primary: '#2563eb',       // blue-600
        primaryDark: '#1d4ed8',   // blue-700
        background: '#ffffff',
        surface: '#f9fafb',       // gray-50
        surfaceAlt: '#f3f4f6',    // gray-100
        text: '#111827',          // gray-900
        textSecondary: '#6b7280', // gray-500
        textTertiary: '#9ca3af',  // gray-400
        textMuted: '#9ca3af',     // gray-400 alias
        border: '#e5e7eb',        // gray-200
        borderStrong: '#d1d5db',  // gray-300
        success: '#16a34a',       // green-600
        warning: '#d97706',       // amber-600
        error: '#dc2626',         // red-600
        info: '#2563eb',          // blue-600
        statusQuoted: '#eab308',  // yellow-500
        statusConfirmed: '#3b82f6', // blue-500
        statusCompleted: '#22c55e', // green-500
        statusCancelled: '#ef4444', // red-500
        tabBar: {
            background: '#ffffff',
            active: '#2563eb',
            inactive: '#6b7280',
        },
        tabBarBorder: '#e5e7eb',
        card: '#ffffff',
        textInverse: '#ffffff',
    },
    dark: {
        primary: '#3b82f6',       // blue-500
        primaryDark: '#2563eb',   // blue-600
        background: '#111827',    // gray-900
        surface: '#1f2937',       // gray-800
        surfaceAlt: '#374151',    // gray-700
        text: '#f9fafb',          // gray-50
        textSecondary: '#9ca3af', // gray-400
        textTertiary: '#6b7280',  // gray-500
        textMuted: '#6b7280',     // gray-500 alias
        border: '#374151',        // gray-700
        borderStrong: '#4b5563',  // gray-600
        success: '#22c55e',       // green-500
        warning: '#f59e0b',       // amber-500
        error: '#ef4444',         // red-500
        info: '#3b82f6',          // blue-500
        statusQuoted: '#eab308',
        statusConfirmed: '#3b82f6',
        statusCompleted: '#22c55e',
        statusCancelled: '#ef4444',
        tabBar: {
            background: '#1f2937',
            active: '#3b82f6',
            inactive: '#6b7280',
        },
        tabBarBorder: '#374151',
        card: '#1f2937',
        textInverse: '#111827',
    },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = typeof colors.light;
