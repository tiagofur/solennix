import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// MARK: - Sidebar Split Layout (iPad Landscape)

/// Two-column layout for iPad landscape: sidebar + content with push navigation.
///
/// Uses a two-column `NavigationSplitView` with a sidebar listing all sections
/// and a content column that shows section-specific views. Detail navigation
/// pushes within the content column (like iPhone) instead of using a separate
/// detail column, giving each view the full content width.
struct SidebarSplitLayout: View {

    private enum SidebarMetrics {
        static let rowInsetLeading: CGFloat = 12
        static let rowInsetTrailing: CGFloat = 10
        static let rowLeadingPadding: CGFloat = 14
        static let rowTrailingPadding: CGFloat = 10
        static let rowVerticalPadding: CGFloat = 9
        static let activeBackgroundOpacity: Double = 0.36
    }

    @Binding var pendingSpotlightRoute: Route?

    @State private var selectedSection: SidebarSection? = .dashboard
    @State private var contentPath = NavigationPath()
    @State private var searchText = ""
    @Environment(\.apiClient) private var apiClient
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        NavigationSplitView {
            sidebarContent
                .navigationTitle("")
                .navigationBarTitleDisplayMode(.inline)
                .navigationSplitViewColumnWidth(min: 236, ideal: 248, max: 260)
        } detail: {
            NavigationStack(path: $contentPath) {
                Group {
                    if let section = selectedSection {
                        sectionListView(for: section)
                    } else {
                        ContentUnavailableView(
                            "Selecciona una seccion",
                            systemImage: "sidebar.left",
                            description: Text("Elige una seccion del menu lateral.")
                        )
                    }
                }
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(SolennixColors.borderStrong.opacity(0.6))
                        .frame(width: 1)
                        .ignoresSafeArea(.container, edges: .vertical)
                }
                .navigationDestination(for: Route.self) { route in
                    RouteDestination(route: route)
                }
                .navigationBarTitleDisplayMode(.inline)
                .searchable(text: $searchText, prompt: globalSearchPrompt)
                .onSubmit(of: .search) {
                    let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !query.isEmpty else { return }
                    searchText = query
                    contentPath.append(Route.search(query: query))
                }
            }
        }
        .onChange(of: selectedSection) { _, _ in
            contentPath = NavigationPath()
        }
        .onChange(of: pendingSpotlightRoute) { _, newRoute in
            guard let route = newRoute else { return }
            contentPath = NavigationPath()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                contentPath.append(route)
            }
            pendingSpotlightRoute = nil
        }
    }

    // MARK: - Sidebar Content

    @ViewBuilder
    private var sidebarContent: some View {
        VStack(spacing: 0) {
            List {
                Section {
                    sidebarBrandingHeader
                }
                .listSectionSeparator(.hidden)

                Section {
                    ForEach(SidebarSection.mainSections, id: \.self) { section in
                        sidebarRow(for: section)
                    }
                } header: {
                    sidebarSectionHeader("Principal")
                }

                Section {
                    sidebarRow(for: .paymentInbox)
                    sidebarRow(for: .settings)
                } header: {
                    sidebarSectionHeader("Configuracion")
                }
            }
            .listStyle(.sidebar)
            .environment(\.defaultMinListRowHeight, 44)
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surface)
            .padding(.top, Spacing.xs)
            .frame(maxHeight: .infinity)
            .toolbarBackground(SolennixColors.surface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)

            Rectangle()
                .fill(SolennixColors.borderStrong.opacity(0.35))
                .frame(height: 1)

            sidebarUserFooter
                .padding(.horizontal, SidebarMetrics.rowInsetLeading)
                .padding(.vertical, Spacing.sm)
                .background(SolennixColors.surface)
        }
        .background(SolennixColors.surface)
    }

    // MARK: - Branding Header

    private var sidebarBrandingHeader: some View {
        HStack(spacing: 10) {
            Image("SolennixLogoIcon")
                .resizable()
                .interpolation(.high)
                .scaledToFit()
                .frame(width: 36, height: 36)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            Text("Solennix")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .glassSurface(opacity: 0.2, blur: 10)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 4, leading: SidebarMetrics.rowInsetLeading, bottom: 6, trailing: SidebarMetrics.rowInsetTrailing))
    }

    // MARK: - User Footer

    @ViewBuilder
    private var sidebarUserFooter: some View {
        if let user = authManager.currentUser {
            Button {
                selectedSection = .settings
            } label: {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(SolennixGradient.premium)
                            .frame(width: 36, height: 36)

                        Text(user.name.prefix(1).uppercased())
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.name)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.text)

                        Text(user.email)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    PlanBadge(plan: user.plan)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .glassSurface(opacity: 0.18, blur: 10)
        }
    }

    private func sidebarSectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.caption)
            .fontWeight(.semibold)
            .tracking(0.5)
            .foregroundStyle(SolennixColors.textTertiary)
            .padding(.leading, SidebarMetrics.rowInsetLeading + 2)
            .padding(.top, Spacing.sm)
            .padding(.bottom, Spacing.xs)
    }

    private func sidebarRow(for section: SidebarSection) -> some View {
        let isActive = selectedSection == section
        return Button {
            selectedSection = section
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: section.iconName)
                    .font(.body.weight(isActive ? .semibold : .regular))
                    .frame(width: 20, alignment: .center)

                Text(section.title)
                    .font(.body.weight(isActive ? .semibold : .regular))

                Spacer(minLength: 0)
            }
            .foregroundStyle(isActive ? SolennixColors.primary : SolennixColors.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, SidebarMetrics.rowLeadingPadding)
            .padding(.trailing, SidebarMetrics.rowTrailingPadding)
            .padding(.vertical, SidebarMetrics.rowVerticalPadding)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 2, leading: SidebarMetrics.rowInsetLeading, bottom: 2, trailing: SidebarMetrics.rowInsetTrailing))
        .listRowBackground(
            isActive
                ? RoundedRectangle(cornerRadius: CornerRadius.lg, style: .continuous)
                    .fill(SolennixColors.primaryLight.opacity(SidebarMetrics.activeBackgroundOpacity))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg, style: .continuous)
                            .stroke(SolennixColors.borderStrong.opacity(0.22), lineWidth: 1)
                    )
                    .padding(.horizontal, 3)
                    .padding(.vertical, 1)
                : nil
        )
    }

    private var globalSearchPrompt: String {
        "Buscar clientes, eventos, productos o inventario..."
    }

    // MARK: - Section List Views

    @ViewBuilder
    private func sectionListView(for section: SidebarSection) -> some View {
        switch section {
        case .dashboard:
            DashboardView()
        case .calendar:
            CalendarView(viewModel: CalendarViewModel(apiClient: apiClient))
        case .events:
            EventListView(apiClient: apiClient)
        case .clients:
            ClientListView(apiClient: apiClient)
        case .personnel:
            StaffListView(apiClient: apiClient)
        case .products:
            ProductListView(apiClient: apiClient)
        case .inventory:
            InventoryListView(apiClient: apiClient)
        case .paymentInbox:
            PaymentInboxView(apiClient: apiClient)
        case .eventFormLinks:
            EventFormLinksView(apiClient: apiClient)
        case .settings:
            SettingsView(apiClient: apiClient, authManager: authManager)
        }
    }

}

// MARK: - SidebarSection Grouping

extension SidebarSection {

    /// Main navigation sections (displayed first in the sidebar).
    static let mainSections: [SidebarSection] = [
        .dashboard, .calendar, .events, .clients, .personnel, .products, .inventory, .paymentInbox, .eventFormLinks
    ]
}

// MARK: - Preview

#Preview {
    SidebarSplitLayout(pendingSpotlightRoute: .constant(nil))
}
