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
    @Environment(\.apiClient) private var apiClient
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        NavigationSplitView {
            sidebarContent
                .navigationTitle("Solennix")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            contentPath.append(Route.eventForm())
                        } label: {
                            Image(systemName: "plus")
                        }
                        .accessibilityLabel("Nuevo Evento")
                    }
                }
        } detail: {
            NavigationStack(path: $contentPath) {
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
        List(selection: $selectedSection) {
            // Main sections
            Section("Principal") {
                ForEach(SidebarSection.mainSections, id: \.self) { section in
                    Label(section.title, systemImage: section.iconName)
                        .tag(section)
                }
            }

            // Utility sections
            Section("Herramientas") {
                ForEach(SidebarSection.utilitySections, id: \.self) { section in
                    Label(section.title, systemImage: section.iconName)
                        .tag(section)
                }
            }

            // Settings at the bottom
            Section {
                Label(SidebarSection.settings.title, systemImage: SidebarSection.settings.iconName)
                    .tag(SidebarSection.settings)
            }
        }
        .listStyle(.sidebar)
    }

    // MARK: - Section List Views

    @ViewBuilder
    private func sectionListView(for section: SidebarSection) -> some View {
        switch section {
        case .dashboard:
            DashboardView()
                .navigationTitle(section.title)
        case .calendar:
            CalendarView(viewModel: CalendarViewModel(apiClient: apiClient))
                .navigationTitle(section.title)
        case .events:
            EventListView(apiClient: apiClient)
                .navigationTitle(section.title)
        case .clients:
            ClientListView(apiClient: apiClient)
                .navigationTitle(section.title)
        case .products:
            ProductListView(apiClient: apiClient)
                .navigationTitle(section.title)
        case .inventory:
            InventoryListView(apiClient: apiClient)
                .navigationTitle(section.title)
        case .search:
            SearchView()
                .navigationTitle(section.title)
        case .settings:
            SettingsView(apiClient: apiClient, authManager: authManager)
                .navigationTitle(section.title)
        }
    }

}

// MARK: - SidebarSection Grouping

extension SidebarSection {

    /// Main navigation sections (displayed first in the sidebar).
    static let mainSections: [SidebarSection] = [
        .dashboard, .calendar, .events, .clients, .products, .inventory
    ]

    /// Utility sections (search, etc.).
    static let utilitySections: [SidebarSection] = [
        .search
    ]
}

// MARK: - Preview

#Preview {
    SidebarSplitLayout(pendingSpotlightRoute: .constant(nil))
}
