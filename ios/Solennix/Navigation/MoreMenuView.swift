import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// MARK: - More Menu View

/// Root view for the "Más" tab on iPhone.
///
/// Uses value-based NavigationLinks (Route enum) instead of destination-based
/// links to prevent SwiftUI from popping detail views when the parent re-renders.
struct MoreMenuView: View {

    /// Scales the icon square with the user's preferred text size.
    @ScaledMetric(relativeTo: .body) private var iconSquareSize: CGFloat = 36

    var body: some View {
        List {
            // Catalog section — plain Text header; .insetGrouped styles it natively
            Section(CommonStrings.navHeaderCatalogo) {
                ForEach(SidebarSection.moreMenuCatalogSections, id: \.self) { section in
                    if let route = section.route {
                        NavigationLink(value: route) {
                            menuRow(
                                icon: section.moreMenuIconName,
                                title: section.title,
                                subtitle: section.moreMenuSubtitle,
                                color: rowColor(for: section)
                            )
                        }
                        .solennixRow()
                        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                    }
                }
            }

            // Settings section — plain Text header; .insetGrouped styles it natively
            Section(CommonStrings.navHeaderConfiguracion) {
                if let settingsRoute = SidebarSection.settings.route {
                    NavigationLink(value: settingsRoute) {
                        menuRow(
                            icon: SidebarSection.settings.moreMenuIconName,
                            title: SidebarSection.settings.title,
                            subtitle: SidebarSection.settings.moreMenuSubtitle,
                            color: rowColor(for: .settings)
                        )
                    }
                    .solennixRow()
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                }
            }
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
        .navigationTitle(CommonStrings.tabMore)
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Menu Row

    private func menuRow(
        icon: String,
        title: String,
        subtitle: String,
        color: Color
    ) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.white)
                .accessibilityHidden(true)
                .frame(width: iconSquareSize, height: iconSquareSize)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title), \(subtitle)")
    }

    // MARK: - Row Color

    /// Maps each SidebarSection to its icon-square background color.
    /// Exhaustive over moreMenuCatalogSections + .settings — no default fallback needed.
    private func rowColor(for section: SidebarSection) -> Color {
        switch section {
        case .products:
            return SolennixColors.iconSlate
        case .inventory:
            return SolennixColors.iconTaupe
        case .paymentInbox:
            return SolennixColors.primary        // gold = money, the only gold
        case .eventFormLinks:
            return SolennixColors.iconSage
        case .personnel:
            return SolennixColors.iconSteel
        case .reviews:
            return SolennixColors.iconPlum
        case .settings:
            return SolennixColors.secondary      // slate gray, Apple gear-style
        case .dashboard, .calendar, .events, .clients:
            return SolennixColors.secondary      // root-tab sections never appear in More menu
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        MoreMenuView()
    }
}
