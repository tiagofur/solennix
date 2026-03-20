import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// MARK: - Sidebar Split Layout (iPad / Mac)

/// The main navigation layout for regular (iPad/Mac) horizontal size class.
///
/// Uses `NavigationSplitView` with a sidebar listing all sections,
/// a content column for section-specific lists, and a detail column
/// for item-level views.
struct SidebarSplitLayout: View {

    @Binding var pendingSpotlightRoute: Route?

    @State private var selectedSection: SidebarSection? = .dashboard
    @State private var detailPath = NavigationPath()
    @Environment(\.apiClient) private var apiClient

    var body: some View {
        NavigationSplitView {
            sidebarContent
                .navigationTitle("Solennix")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            detailPath.append(Route.eventForm())
                        } label: {
                            Image(systemName: "plus")
                        }
                        .accessibilityLabel("Nuevo Evento")
                    }
                }
        } content: {
            if let section = selectedSection {
                sectionListView(for: section)
            } else {
                ContentUnavailableView(
                    "Selecciona una seccion",
                    systemImage: "sidebar.left",
                    description: Text("Elige una seccion del menu lateral.")
                )
            }
        } detail: {
            NavigationStack(path: $detailPath) {
                ContentUnavailableView(
                    "Selecciona un elemento",
                    systemImage: "doc.text.magnifyingglass",
                    description: Text("Elige un elemento de la lista para ver los detalles.")
                )
                .navigationDestination(for: Route.self) { route in
                    RouteDestination(route: route)
                }
            }
        }
        .onChange(of: pendingSpotlightRoute) { _, newRoute in
            guard let route = newRoute else { return }
            // Navegar al detalle desde la ruta de Spotlight
            detailPath = NavigationPath()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                detailPath.append(route)
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
            SettingsView(apiClient: apiClient)
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
