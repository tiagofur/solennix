import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixFeatures
import SolennixNetwork

// The app defines a `Tab` enum in Route.swift that shadows SwiftUI.Tab.
// Provide a local alias so iOS 26 code can use both without qualification noise.
private typealias AppTab = Tab

// MARK: - Compact Tab Layout (iPhone)

/// The main tab-based layout for compact (iPhone) horizontal size class.
///
/// On iOS 26+ uses the `Tab` builder syntax to unlock `tabBarMinimizeBehavior`
/// and minimized search toolbar behavior (no search-role tab — see note in
/// `ios26TabView`). On iOS 17–25 falls back to the standard `.tabItem {}` syntax.
struct CompactTabLayout: View {

    @Binding var pendingSpotlightRoute: Route?

    @State private var selectedTab: Tab = .home
    @State private var homePath = NavigationPath()
    @State private var eventsPath = NavigationPath()
    @State private var clientsPath = NavigationPath()
    @State private var morePath = NavigationPath()
    @State private var homeSearchText = ""

    // MARK: - Body

    var body: some View {
        if #available(iOS 26.0, *) {
            ios26TabView
        } else {
            legacyTabView
        }
    }

    // MARK: - iOS 26+ Tab View

    @available(iOS 26.0, *)
    @ViewBuilder
    private var ios26TabView: some View {
        // SwiftUI supports `Tab(_:systemImage:value:)` in a selection-bound TabView
        // (WWDC25 pattern). We bind `ios26TabSelection` so same-tab re-tap pops to
        // root and Spotlight deep links can set selectedTab before pushing onto
        // homePath — matching the legacy branch's behavior.
        TabView(selection: ios26TabSelection) {
            SwiftUI.Tab(AppTab.home.title, systemImage: AppTab.home.iconName, value: AppTab.home) {
                homeTabContent
            }

            SwiftUI.Tab(AppTab.events.title, systemImage: AppTab.events.iconName, value: AppTab.events) {
                eventsTabContent
            }

            SwiftUI.Tab(AppTab.clients.title, systemImage: AppTab.clients.iconName, value: AppTab.clients) {
                clientsTabContent
            }

            SwiftUI.Tab(AppTab.more.title, systemImage: AppTab.more.iconName, value: AppTab.more) {
                moreTabContent
            }

            // NOTE: the search tab lands in PR2. The app currently has 4 regular
            // tabs (home, events, clients, more) — Calendar was unified into
            // Events (Phase 5.4), so the prior overflow condition (when there were
            // 5 regular tabs, 5 + 1 search = 6 spawned a system overflow on
            // iOS 26.5) no longer applies. PR2 adds Tab(role: .search) here and
            // validates the 4 + 1 = 5 slot fit on-device; if it overflows, the
            // regular 5th-tab fallback is used
            // (see openspec/changes/bottom-nav-search/design.md).
        }
        .tint(SolennixColors.tabBarActive)
        .tabBarMinimizeBehavior(.onScrollDown)
        .onChange(of: pendingSpotlightRoute) { _, newRoute in
            guard let route = newRoute else { return }
            // Spotlight routes always land on the home tab+path — set selectedTab
            // first so the tab switches before the navigation push, matching
            // the legacy branch behavior.
            selectedTab = .home
            homePath = NavigationPath()
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(100))
                homePath.append(route)
            }
            pendingSpotlightRoute = nil
        }
    }

    /// Custom binding for the iOS 26 TabView that pops to root on same-tab re-tap.
    /// Mirrors `legacyTabSelection` so both branches share the same UX contract.
    @available(iOS 26.0, *)
    private var ios26TabSelection: Binding<AppTab> {
        Binding(get: { selectedTab }, set: { applyTabSelection($0) })
    }

    // MARK: - Legacy Tab View (iOS 17–25)

    @ViewBuilder
    private var legacyTabView: some View {
        TabView(selection: legacyTabSelection) {
            // Home Tab
            homeTabContent
                .tabItem { Label(Tab.home.title, systemImage: Tab.home.iconName) }
                .tag(AppTab.home)

            // Events Tab — EventListView provides its own .searchable for
            // local filtering of the events list.
            eventsTabContent
                .tabItem { Label(Tab.events.title, systemImage: Tab.events.iconName) }
                .tag(AppTab.events)

            // Clients Tab — ClientListView provides its own .searchable for
            // local filtering of the clients list.
            clientsTabContent
                .tabItem { Label(Tab.clients.title, systemImage: Tab.clients.iconName) }
                .tag(AppTab.clients)

            // More Tab
            moreTabContent
                .tabItem { Label(Tab.more.title, systemImage: Tab.more.iconName) }
                .tag(AppTab.more)
        }
        .tint(SolennixColors.tabBarActive)
        .onChange(of: pendingSpotlightRoute) { _, newRoute in
            guard let route = newRoute else { return }
            // Navigate from Home tab for Spotlight routes
            selectedTab = .home
            homePath = NavigationPath()
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(100))
                homePath.append(route)
            }
            pendingSpotlightRoute = nil
        }
    }

    // MARK: - Shared Per-Tab Content
    //
    // Each @ViewBuilder property builds the NavigationStack + root view for one tab.
    // Both ios26TabView and legacyTabView reference these so per-tab structure
    // can never drift between branches.

    @ViewBuilder
    private var homeTabContent: some View {
        NavigationStack(path: $homePath) {
            HomeRootView()
                .navigationDestination(for: Route.self) { route in
                    RouteDestination(route: route)
                }
                .searchable(text: $homeSearchText, prompt: globalSearchPrompt)
                .searchMinimizedIfAvailable()
                .onSubmit(of: .search) {
                    appendSearchRoute(query: &homeSearchText, to: &homePath)
                }
        }
    }

    @ViewBuilder
    private var eventsTabContent: some View {
        NavigationStack(path: $eventsPath) {
            EventsRootView()
                .navigationDestination(for: Route.self) { route in
                    RouteDestination(route: route)
                }
        }
    }

    @ViewBuilder
    private var clientsTabContent: some View {
        NavigationStack(path: $clientsPath) {
            ClientsRootView()
                .navigationDestination(for: Route.self) { route in
                    RouteDestination(route: route)
                }
        }
    }

    @ViewBuilder
    private var moreTabContent: some View {
        NavigationStack(path: $morePath) {
            MoreMenuView()
                .navigationDestination(for: Route.self) { route in
                    RouteDestination(route: route)
                }
        }
    }

    /// Custom binding for the legacy TabView that pops to root on same-tab re-tap.
    private var legacyTabSelection: Binding<AppTab> {
        Binding(get: { selectedTab }, set: { applyTabSelection($0) })
    }

    /// Shared selection handler used by both `ios26TabSelection` and
    /// `legacyTabSelection`. Delegates the reset/preserve decision to the pure
    /// `resolveTabChange` reducer (design Decision 4):
    ///   - re-tap → reset that tab (pop to root)
    ///   - search transition (enter/leave) → preserve both stacks
    ///   - regular → different regular → reset the leaving tab (unchanged UX)
    private func applyTabSelection(_ newTab: Tab) {
        let effect = resolveTabChange(current: selectedTab, next: newTab)
        if let resetTab = effect.resetTab {
            resetPath(for: resetTab)
        }
        selectedTab = newTab
    }

    // MARK: - Helpers

    private var globalSearchPrompt: String {
        CommonStrings.globalSearchPrompt
    }

    private func resetPath(for tab: Tab) {
        switch tab {
        case .home:     homePath = NavigationPath()
        case .events:   eventsPath = NavigationPath()
        case .clients:  clientsPath = NavigationPath()
        case .more:     morePath = NavigationPath()
        case .search:   break // PR2 wires `searchPath`; search has no nav state yet.
        }
    }

    private func appendSearchRoute(query: inout String, to path: inout NavigationPath) {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else { return }
        query = trimmedQuery
        path.append(Route.search(query: trimmedQuery))
    }
}

// MARK: - Tab Root Views

/// Root view for the Home (Dashboard) tab.
private struct HomeRootView: View {
    var body: some View {
        DashboardView()
    }
}

/// Root view for the Calendar tab (redirects to Events — Calendar tab removed in Phase 5.4).
private struct CalendarRootView: View {
    @Environment(\.apiClient) private var apiClient

    var body: some View {
        EventListView(apiClient: apiClient)
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
