import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// MARK: - Compact Tab Layout (iPhone)

/// The main tab-based layout for compact (iPhone) horizontal size class.
///
/// Contains four tabs, each with its own `NavigationStack` and independent
/// navigation path.
struct CompactTabLayout: View {

    @Binding var pendingSpotlightRoute: Route?

    @State private var selectedTab: Tab = .home
    @State private var homePath = NavigationPath()
    @State private var calendarPath = NavigationPath()
    @State private var clientsPath = NavigationPath()
    @State private var morePath = NavigationPath()
    @Environment(\.apiClient) private var apiClient

    var body: some View {
        TabView(selection: $selectedTab) {
            // Home Tab
            NavigationStack(path: $homePath) {
                HomeRootView()
                    .navigationDestination(for: Route.self) { route in
                        RouteDestination(route: route)
                    }
            }
            .tabItem {
                Label(Tab.home.title, systemImage: Tab.home.iconName)
            }
            .tag(Tab.home)

            // Calendar Tab
            NavigationStack(path: $calendarPath) {
                CalendarRootView()
                    .navigationDestination(for: Route.self) { route in
                        RouteDestination(route: route)
                    }
            }
            .tabItem {
                Label(Tab.calendar.title, systemImage: Tab.calendar.iconName)
            }
            .tag(Tab.calendar)

            // Clients Tab
            NavigationStack(path: $clientsPath) {
                ClientsRootView()
                    .navigationDestination(for: Route.self) { route in
                        RouteDestination(route: route)
                    }
            }
            .tabItem {
                Label(Tab.clients.title, systemImage: Tab.clients.iconName)
            }
            .tag(Tab.clients)

            // More Tab
            NavigationStack(path: $morePath) {
                MoreMenuView()
                    .navigationDestination(for: Route.self) { route in
                        RouteDestination(route: route)
                    }
            }
            .tabItem {
                Label(Tab.more.title, systemImage: Tab.more.iconName)
            }
            .tag(Tab.more)
        }
        .tint(SolennixColors.tabBarActive)
        .onChange(of: pendingSpotlightRoute) { _, newRoute in
            guard let route = newRoute else { return }
            // Navegar desde la pestaña Home para rutas de Spotlight
            selectedTab = .home
            homePath = NavigationPath()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                homePath.append(route)
            }
            pendingSpotlightRoute = nil
        }
    }
}

// MARK: - Tab Root Views

/// Root view for the Home (Dashboard) tab.
private struct HomeRootView: View {
    var body: some View {
        DashboardView()
    }
}

/// Root view for the Calendar tab.
private struct CalendarRootView: View {
    @Environment(\.apiClient) private var apiClient

    var body: some View {
        CalendarView(viewModel: CalendarViewModel(apiClient: apiClient))
    }
}

/// Root view for the Clients tab.
private struct ClientsRootView: View {
    @Environment(\.apiClient) private var apiClient

    var body: some View {
        ClientListView(apiClient: apiClient)
    }
}

// MARK: - Preview

#Preview {
    CompactTabLayout(pendingSpotlightRoute: .constant(nil))
}
