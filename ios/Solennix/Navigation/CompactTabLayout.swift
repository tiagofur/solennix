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
    @State private var eventsPath = NavigationPath()
    @State private var clientsPath = NavigationPath()
    @State private var morePath = NavigationPath()
    @Environment(\.apiClient) private var apiClient

    /// Custom binding that detects same-tab re-taps for pop-to-root.
    private var tabSelection: Binding<Tab> {
        Binding(
            get: { selectedTab },
            set: { newTab in
                if newTab == selectedTab {
                    resetPath(for: newTab)
                }
                selectedTab = newTab
            }
        )
    }

    var body: some View {
        TabView(selection: tabSelection) {
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

            // Events Tab
            NavigationStack(path: $eventsPath) {
                EventsRootView()
                    .navigationDestination(for: Route.self) { route in
                        RouteDestination(route: route)
                    }
            }
            .tabItem {
                Label(Tab.events.title, systemImage: Tab.events.iconName)
            }
            .tag(Tab.events)

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
        .overlay {
            if showsFAB {
                QuickActionsFAB(
                    onNewEvent: { appendToCurrentPath(Route.eventForm()) },
                    onQuickQuote: { appendToCurrentPath(Route.quickQuote) }
                )
            }
        }
        .onChange(of: selectedTab) { oldTab, _ in
            resetPath(for: oldTab)
        }
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

    /// Tabs where the FAB should be visible.
    private var showsFAB: Bool {
        switch selectedTab {
        case .home, .calendar, .events, .clients: return true
        case .more: return false
        }
    }

    /// Pushes a route onto the currently selected tab's NavigationPath.
    private func appendToCurrentPath(_ route: Route) {
        switch selectedTab {
        case .home:     homePath.append(route)
        case .calendar: calendarPath.append(route)
        case .events:   eventsPath.append(route)
        case .clients:  clientsPath.append(route)
        case .more:     morePath.append(route)
        }
    }

    private func resetPath(for tab: Tab) {
        switch tab {
        case .home:     homePath = NavigationPath()
        case .calendar: calendarPath = NavigationPath()
        case .events:   eventsPath = NavigationPath()
        case .clients:  clientsPath = NavigationPath()
        case .more:     morePath = NavigationPath()
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

/// Root view for the Events tab.
private struct EventsRootView: View {
    @Environment(\.apiClient) private var apiClient

    var body: some View {
        EventListView(apiClient: apiClient)
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
