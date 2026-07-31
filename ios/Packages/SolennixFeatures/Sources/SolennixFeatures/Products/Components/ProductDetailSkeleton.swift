import SwiftUI
import SolennixDesign

// MARK: - Product Detail Skeleton (in-ScrollView placeholder)

struct ProductDetailSkeleton: View {
    @ScaledMetric(relativeTo: .body) private var scaledImageHeight: CGFloat = 280
    private var cappedImageHeight: CGFloat { min(scaledImageHeight, 400) }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Stretchy Header placeholder (flat because loading, but matches height)
                Rectangle()
                    .fill(SolennixColors.surface)
                    .frame(height: cappedImageHeight)

                VStack(spacing: Spacing.md) {
                    // Title & Category skeleton card
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        SkeletonLine(width: 80, height: 14)
                        SkeletonLine(width: 200, height: 24)
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Smart Alert Skeleton
                    HStack(alignment: .top, spacing: Spacing.md) {
                        SkeletonLine(width: 22, height: 22)
                            .clipShape(Circle())
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            SkeletonLine(width: 180, height: 14)
                            SkeletonLine(width: 120, height: 12)
                        }
                        Spacer()
                    }
                    .padding(Spacing.md)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .padding(.horizontal, Spacing.md)

                    // KPI Skeleton (2x2 grid inside a single card)
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            kpiSkeletonCard()
                            Divider().frame(height: 70)
                            kpiSkeletonCard()
                        }
                        Divider().padding(.horizontal, Spacing.md)
                        HStack(spacing: 0) {
                            kpiSkeletonCard()
                            Divider().frame(height: 70)
                            kpiSkeletonCard()
                        }
                    }
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Chart skeleton
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SkeletonLine(width: 160, height: 18)
                        SkeletonLine(height: 200)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .padding(Spacing.md)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Recipe composition skeleton
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: Spacing.sm) {
                            SkeletonLine(width: 16, height: 16)
                            SkeletonLine(width: 140, height: 16)
                            Spacer()
                        }
                        .padding(Spacing.md)

                        Divider()

                        HStack {
                            SkeletonLine(width: 60, height: 10)
                            Spacer()
                            SkeletonLine(width: 60, height: 10)
                            SkeletonLine(width: 70, height: 10)
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .background(SolennixColors.surface)

                        ForEach(0..<3, id: \.self) { _ in
                            Divider().opacity(0.5)
                            HStack {
                                SkeletonLine(width: 100, height: 14)
                                Spacer()
                                SkeletonLine(width: 50, height: 14)
                                SkeletonLine(width: 60, height: 14)
                            }
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .frame(minHeight: 44)
                        }
                    }
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // General info skeleton
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SkeletonLine(width: 140, height: 10)

                        HStack(spacing: Spacing.md) {
                            SkeletonLine(width: 18, height: 18)
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 60, height: 10)
                                SkeletonLine(width: 100, height: 14)
                            }
                        }

                        Divider()

                        HStack(spacing: Spacing.md) {
                            SkeletonLine(width: 18, height: 18)
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 60, height: 10)
                                SkeletonLine(width: 80, height: 14)
                            }
                        }

                        Divider()

                        HStack(spacing: Spacing.md) {
                            SkeletonLine(width: 18, height: 18)
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 80, height: 10)
                                SkeletonLine(width: 140, height: 14)
                            }
                        }
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    Color.clear.frame(height: Spacing.xl)
                }
                .padding(.top, -24)
                .zIndex(1)
            }
        }
        .ignoresSafeArea(.container, edges: .top)
    }

    private func kpiSkeletonCard() -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            SkeletonLine(width: 40, height: 10)
            SkeletonLine(width: 60, height: 22)
            SkeletonLine(width: 30, height: 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
    }
}
