import SwiftUI

// MARK: - Skeleton Line

/// A single rounded rectangle placeholder with a pulsing shimmer animation.
/// Respects `accessibilityReduceMotion` — disables the pulse when the user
/// has requested reduced motion.
public struct SkeletonLine: View {
    var width: CGFloat? = nil
    var height: CGFloat = 16

    @State private var isAnimating = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(width: CGFloat? = nil, height: CGFloat = 16) {
        self.width = width
        self.height = height
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: CornerRadius.sm)
            .fill(SolennixColors.surfaceAlt)
            .frame(width: width, height: height)
            .opacity(isAnimating ? 0.4 : 0.8)
            .animation(
                reduceMotion ? nil : .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                value: isAnimating
            )
            .onAppear {
                if !reduceMotion {
                    isAnimating = true
                }
            }
    }
}

// MARK: - Skeleton Card

/// A card-shaped placeholder with multiple skeleton lines for loading states.
public struct SkeletonCard: View {
    @State private var isAnimating = false

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header row: avatar + title
            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 40, height: 40)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 140, height: 14)
                    SkeletonLine(width: 90, height: 12)
                }
            }

            // Content lines
            SkeletonLine(height: 14)
            SkeletonLine(width: 220, height: 14)
            SkeletonLine(width: 160, height: 14)

            // Bottom row
            HStack {
                SkeletonLine(width: 80, height: 24)
                Spacer()
                SkeletonLine(width: 60, height: 14)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }
}

// MARK: - Preview

#Preview("Skeleton Views") {
    VStack(spacing: Spacing.md) {
        SkeletonLine()
        SkeletonLine(width: 200, height: 20)

        Divider()

        SkeletonCard()
        SkeletonCard()
    }
    .padding()
    .background(SolennixColors.surfaceGrouped)
}
