import SwiftUI
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// MARK: - Compact Tab Layout (iPhone)

/// The main tab-based layout for compact (iPhone) horizontal size class.
///
/// Contains four tabs, each with its own `NavigationStack` and independent
/// navigation path. A floating action button (FAB) overlays the tab bar
/// for quick event creation.
struct CompactTabLayout: View {

    @Binding var pendingSpotlightRoute: Route?

    @State private var selectedTab: Tab = .home
    @State private var homePath = NavigationPath()
    @State private var calendarPath = NavigationPath()
    @State private var clientsPath = NavigationPath()
    @State private var morePath = NavigationPath()
    @Environment(\.apiClient) private var apiClient
    @Environment(PlanLimitsManager.self) private var planLimitsManager

    var body: some View {
        ZStack(alignment: .bottom) {
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

            // FAB overlay
            NewEventFAB(isDisabled: !planLimitsManager.canCreateEvent) {
                if planLimitsManager.canCreateEvent {
                    selectedTab = .home
                    homePath.append(Route.eventForm())
                }
            }
            .padding(.bottom, 54) // Position above the tab bar
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
}

// MARK: - New Event FAB

/// Circular floating action button with premium gradient for creating new events.
private struct NewEventFAB: View {

    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(isDisabled ? AnyShapeStyle(SolennixColors.surfaceAlt) : AnyShapeStyle(SolennixGradient.premium))
                    .frame(width: 56, height: 56)

                Image(systemName: "plus")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(isDisabled ? SolennixColors.textTertiary : SolennixColors.textInverse)
            }
        }
        .disabled(isDisabled)
        .shadowFab()
        .accessibilityLabel("Nuevo Evento")
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
            .navigationTitle("Calendario")
            .navigationBarTitleDisplayMode(.inline)
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
