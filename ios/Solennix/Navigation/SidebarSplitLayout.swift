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

                Section("Principal") {
                    ForEach(SidebarSection.mainSections, id: \.self) { section in
                        sidebarRow(for: section)
                    }
                }

                Section("Configuración") {
                    sidebarRow(for: .settings)
                }
            }
            .listStyle(.sidebar)
            .frame(maxHeight: .infinity)
            .toolbarBackground(SolennixColors.surfaceGrouped, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)

            Divider()

            sidebarUserFooter
        }
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
        .padding(.vertical, 6)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
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
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }

    private func sidebarRow(for section: SidebarSection) -> some View {
        let isActive = selectedSection == section
        return Button {
            selectedSection = section
        } label: {
            Label(section.title, systemImage: section.iconName)
                .foregroundStyle(isActive ? SolennixColors.primary : SolennixColors.textSecondary)
                .fontWeight(isActive ? .semibold : .regular)
        }
        .buttonStyle(.plain)
        .listRowBackground(
            isActive
                ? RoundedRectangle(cornerRadius: 28)
                    .fill(SolennixColors.primaryLight)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
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
    nonisolated(unsafe) static let mainSections: [SidebarSection] = [
        .dashboard, .calendar, .events, .clients, .personnel, .products, .inventory, .eventFormLinks
    ]
}

// MARK: - Preview

#Preview {
    SidebarSplitLayout(pendingSpotlightRoute: .constant(nil))
}
