import SwiftUI
import SolennixDesign

// MARK: - KPI Card View

/// Reusable card component for displaying a single KPI metric.
public struct KPICardView: View {

    let title: String
    let value: String
    let icon: String
    let iconColor: Color
    let iconBgColor: Color
    var subtitle: String?
    var flexible: Bool

    public init(
        title: String,
        value: String,
        icon: String,
        iconColor: Color,
        iconBgColor: Color,
        subtitle: String? = nil,
        flexible: Bool = false
    ) {
        self.title = title
        self.value = value
        self.icon = icon
        self.iconColor = iconColor
        self.iconBgColor = iconBgColor
        self.subtitle = subtitle
        self.flexible = flexible
    }

    public var body: some View {
        VStack(spacing: Spacing.sm) {
            // Icon circle
            Image(systemName: icon)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(iconColor)
                .frame(width: 40, height: 40)
                .background(iconBgColor)
                .clipShape(Circle())

            // Value
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            // Title
            Text(title)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
                .lineLimit(1)

            // Optional subtitle
            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .lineLimit(1)
            }
        }
        .frame(width: flexible ? nil : 155)
        .frame(maxWidth: flexible ? .infinity : nil)
        .padding(.vertical, Spacing.md)
        .padding(.horizontal, Spacing.sm)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }
}

// MARK: - Preview

#Preview("KPI Cards") {
    ScrollView(.horizontal) {
        HStack(spacing: Spacing.md) {
            KPICardView(
                title: "Ventas Netas",
                value: "$45,000",
                icon: "dollarsign.circle",
                iconColor: SolennixColors.kpiGreen,
                iconBgColor: SolennixColors.kpiGreenBg
            )

            KPICardView(
                title: "Cobrado",
                value: "$32,000",
                icon: "banknote",
                iconColor: SolennixColors.kpiOrange,
                iconBgColor: SolennixColors.kpiOrangeBg,
                subtitle: "71% cobrado"
            )

            KPICardView(
                title: "IVA Cobrado",
                value: "$5,120",
                icon: "percent",
                iconColor: SolennixColors.kpiBlue,
                iconBgColor: SolennixColors.kpiBlueBg
            )
        }
        .padding()
    }
    .background(SolennixColors.surfaceGrouped)
}
