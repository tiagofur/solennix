import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Inventory Detail Skeleton (in-List, fix #5)

struct InventoryDetailSkeleton: View {

    @ScaledMetric(relativeTo: .body) private var scaledIconSize: CGFloat = 48
    private var cappedIconSize: CGFloat { min(scaledIconSize, 64) }

    var body: some View {
        // Stock hero
        Section {
            VStack(spacing: Spacing.md) {
                HStack {
                    SkeletonLine(width: 22, height: 22).clipShape(Circle())
                    SkeletonLine(width: 80, height: 16)
                    Spacer()

                    HStack(spacing: Spacing.xs) {
                        SkeletonLine(width: 60, height: 20).clipShape(Capsule())
                        SkeletonLine(width: 70, height: 20).clipShape(Capsule())
                    }
                }
                HStack(alignment: .lastTextBaseline, spacing: Spacing.xs) {
                    SkeletonLine(width: 80, height: CGFloat(cappedIconSize))
                    SkeletonLine(width: 40, height: 20)
                    Spacer()
                }
                SkeletonLine(height: 4).clipShape(RoundedRectangle(cornerRadius: 2))
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // KPI row
        Section {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 40, height: 10)
                    SkeletonLine(width: 60, height: 22)
                    SkeletonLine(width: 30, height: 10)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.md)

                Divider()
                    .frame(height: 50)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 40, height: 10)
                    SkeletonLine(width: 60, height: 22)
                    SkeletonLine(width: 30, height: 10)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.md)
            }
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Smart alert
        Section {
            HStack(alignment: .top, spacing: Spacing.md) {
                SkeletonLine(width: 22, height: 22).clipShape(Circle())
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    SkeletonLine(width: 180, height: 14)
                    SkeletonLine(width: 120, height: 12)
                }
                Spacer()
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Stock health bars
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                SkeletonLine(width: 100, height: 10)
                ForEach(0..<3, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            SkeletonLine(width: 80, height: 10)
                            Spacer()
                            SkeletonLine(width: 50, height: 10)
                        }
                        SkeletonLine(height: 8).clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Info card
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                SkeletonLine(width: 100, height: 10)
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
                        SkeletonLine(width: 80, height: 10)
                        SkeletonLine(width: 120, height: 14)
                    }
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }

        // Demand forecast skeleton
        Section {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    SkeletonLine(width: 16, height: 16)
                    SkeletonLine(width: 140, height: 16)
                    Spacer()
                    SkeletonLine(width: 80, height: 10)
                }
                ForEach(0..<3, id: \.self) { _ in
                    HStack {
                        SkeletonLine(width: 8, height: 8).clipShape(Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            SkeletonLine(width: 60, height: 14)
                            SkeletonLine(width: 100, height: 10)
                        }
                        Spacer()
                        SkeletonLine(width: 50, height: 14)
                    }
                    .padding(.vertical, Spacing.xs)
                }
            }
            .padding(Spacing.md)
            .solennixRow()
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
        }
    }
}
