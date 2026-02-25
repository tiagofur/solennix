/**
 * Spacing scale based on 4px grid.
 * Usage: spacing.md → 16
 */
export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
    },
} as const;

/** @deprecated Use spacing.borderRadius */
export const borderRadius = spacing.borderRadius;
