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

    var body: some View {
        List {
            // Catalog section
            Section {
                ForEach(SidebarSection.moreMenuCatalogSections, id: \.self) { section in
                    if let route = section.route {
                        NavigationLink(value: route) {
                            menuRow(
                                icon: section.iconName,
                                title: section.title,
                                subtitle: section.moreMenuSubtitle,
                                color: rowColor(for: section)
                            )
                        }
                    }
                }
            } header: {
                Text(CommonStrings.navHeaderCatalogo)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            // Settings section
            Section {
                if let settingsRoute = SidebarSection.settings.route {
                    NavigationLink(value: settingsRoute) {
                        menuRow(
                            icon: SidebarSection.settings.iconName,
                            title: SidebarSection.settings.title,
                            subtitle: SidebarSection.settings.moreMenuSubtitle,
                            color: SolennixColors.textSecondary
                        )
                    }
                }
            } header: {
                Text(CommonStrings.navHeaderConfiguracion)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
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
                .frame(width: 36, height: 36)
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
        .padding(.vertical, Spacing.xs)
    }

    private func rowColor(for section: SidebarSection) -> Color {
        switch section {
        case .products, .paymentInbox:
            return SolennixColors.primary
        case .inventory:
            return SolennixColors.warning
        case .eventFormLinks:
            return SolennixColors.success
        case .personnel:
            return SolennixColors.info
        default:
            return SolennixColors.textSecondary
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        MoreMenuView()
    }
}
