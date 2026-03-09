import { Platform } from 'react-native';

const fontFamily = Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
});

export const typography = {
    // Premium Design Series (March 2026 overhaul)
    h1Premium: {
        fontFamily,
        fontSize: 28,
        fontWeight: '900' as const, // For "font-black"
        letterSpacing: -0.5, // For "tracking-tight"
        lineHeight: 34,
    },
    // iOS Dynamic Type scale
    largeTitle: {
        fontFamily,
        fontSize: 34,
        fontWeight: '700' as const,
        lineHeight: 41,
    },
    title1: {
        fontFamily,
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 34,
    },
    title2: {
        fontFamily,
        fontSize: 22,
        fontWeight: '700' as const,
        lineHeight: 28,
    },
    title3: {
        fontFamily,
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 25,
    },
    headline: {
        fontFamily,
        fontSize: 17,
        fontWeight: '600' as const,
        lineHeight: 22,
    },
    body: {
        fontFamily,
        fontSize: 17,
        fontWeight: '400' as const,
        lineHeight: 22,
    },
    callout: {
        fontFamily,
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 21,
    },
    subheadline: {
        fontFamily,
        fontSize: 15,
        fontWeight: '400' as const,
        lineHeight: 20,
    },
    footnote: {
        fontFamily,
        fontSize: 13,
        fontWeight: '400' as const,
        lineHeight: 18,
    },
    caption1: {
        fontFamily,
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
    },
    caption2: {
        fontFamily,
        fontSize: 11,
        fontWeight: '400' as const,
        lineHeight: 13,
    },

    // Legacy aliases (backwards compat)
    h1: {
        fontFamily,
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 34,
    },
    h2: {
        fontFamily,
        fontSize: 22,
        fontWeight: '700' as const,
        lineHeight: 28,
    },
    h3: {
        fontFamily,
        fontSize: 18,
        fontWeight: '600' as const,
        lineHeight: 24,
    },
    bodySmall: {
        fontFamily,
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
    },
    caption: {
        fontFamily,
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
    },
    button: {
        fontFamily,
        fontSize: 16,
        fontWeight: '600' as const,
        lineHeight: 22,
    },
    label: {
        fontFamily,
        fontSize: 14,
        fontWeight: '500' as const,
        lineHeight: 20,
    },
} as const;
