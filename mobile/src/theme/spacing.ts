/**
 * Spacing scale based on 4px grid.
 * Usage: spacing.md → 16
 */
export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,     // screen horizontal margin (consistent)
    xl: 24,     // between sections
    xxl: 32,
    xxxl: 48,
    borderRadius: {
        sm: 6,
        md: 10,
        lg: 14,
        xl: 20,
        full: 9999,
    },
} as const;

/** @deprecated Use spacing.borderRadius */
export const borderRadius = spacing.borderRadius;
