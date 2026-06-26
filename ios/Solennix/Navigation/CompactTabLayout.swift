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
/// On iOS 26+ uses the `Tab` builder syntax with a trailing search-role tab
/// (`Tab(role: .search)`) + `.tabViewSearchActivation`, plus
/// `tabBarMinimizeBehavior`. On iOS 17–25 falls back to the standard
/// `.tabItem {}` syntax with a regular 5th magnifier tab (PR2).
struct CompactTabLayout: View {

    @Binding var pendingSpotlightRoute: Route?

    @State private var selectedTab: Tab = .home
    @State private var homePath = NavigationPath()
    @State private var eventsPath = NavigationPath()
    @State private var clientsPath = NavigationPath()
    @State private var morePath = NavigationPath()
    @State private var searchPath = NavigationPath()

    /// Search view model owned by the layout so it is non-nil from the first
    /// render (avoiding SwiftUI's `@State` re-init trap) and so the shared
    /// `applyTabSelection` chokepoint can clear it on leaving the search tab
    /// (spec R7). It is injected into `SearchView(context: .bottomNavTab)`;
    /// `SearchViewModel` remains the text owner (design Decision 2).
    @State private var searchViewModel: SearchViewModel

    init(apiClient: APIClient, pendingSpotlightRoute: Binding<Route?>) {
        // `@State` initialValue is honored only on the first init, so the model
        // instance is preserved across view re-creations.
        _searchViewModel = State(initialValue: SearchViewModel(apiClient: apiClient))
        _pendingSpotlightRoute = pendingSpotlightRoute
    }

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

            // PR2: global search as a 5th bottom-nav destination. Primary path =
            // a search-role tab (system pins it trailing, supplies the "Buscar"
            // title); `.tabViewSearchActivation` drives native focus + the
            // system-managed dismiss-restore. The 4-regular + 1-search-role =
            // 5-slot fit is spike-validated on-device (see
            // `openspec/changes/bottom-nav-search/` — `slot-fit-pr2` verdict +
            // screenshot). The legacy fallback branch below uses a regular tab.
            SwiftUI.Tab(value: AppTab.search, role: .search) {
                searchTabContent
            }
        }
        .tint(SolennixColors.tabBarActive)
        .tabBarMinimizeBehavior(.onScrollDown)
        .tabViewSearchActivation(.searchTabSelection)
        .onChange(of: pendingSpotlightRoute) { _, newRoute in
            guard let route = newRoute else { return }
            // F-1: route the Spotlight tab-transition through the same clear-on-
            // exit chokepoint as user tab taps, so a search query held on the
            // search tab is cleared (not left stale) when Spotlight navigates to
            // home (spec R7). Spotlight always lands on the home tab+path.
            let plan = planSpotlightTransition(from: selectedTab, to: .home)
            if plan.clearSearchOnExit {
                searchViewModel.clearSearch()
            }
            // Set selectedTab first so the tab switches before the navigation
            // push, matching the legacy branch behavior.
            selectedTab = plan.destinationTab
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

            // PR2: search as a regular 5th magnifier tab (iOS 17–25). Search-role
            // + `.tabViewSearchActivation` are unavailable pre-iOS 26 (design
            // Decision 8), so this is a plain tab sharing the same
            // `searchTabContent` builder as the iOS 26 branch (spec R1 iOS17–25).
            searchTabContent
                .tabItem { Label(Tab.search.title, systemImage: Tab.search.iconName) }
                .tag(AppTab.search)
        }
        .tint(SolennixColors.tabBarActive)
        .onChange(of: pendingSpotlightRoute) { _, newRoute in
            guard let route = newRoute else { return }
            // F-1: route the Spotlight tab-transition through the same clear-on-
            // exit chokepoint (see the ios26 branch). Keeps the search query from
            // going stale when Spotlight navigates away from the search tab.
            let plan = planSpotlightTransition(from: selectedTab, to: .home)
            if plan.clearSearchOnExit {
                searchViewModel.clearSearch()
            }
            // Navigate from Home tab for Spotlight routes
            selectedTab = plan.destinationTab
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
        // PR3 task 3.4 — the Home (Dashboard) top `.searchable` is RETIRED. Home
        // is a non-list surface, and global search now lives in its own bottom-nav
        // tab (design Decision 7). Removing it eliminates the duplicate entry and
        // the `homeSearchText`/`appendSearchRoute`/local `globalSearchPrompt`
        // plumbing. `CommonStrings.globalSearchPrompt` is KEPT (the iPad sidebar
        // + the search tab still use it). Spotlight search entry is unaffected:
        // it pushes `Route.search(query:)` onto `homePath` directly.
        NavigationStack(path: $homePath) {
            HomeRootView()
                .navigationDestination(for: Route.self) { route in
                    RouteDestination(route: route)
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

    /// Search tab content, shared by the iOS 26 search-role tab and the iOS 17–25
    /// regular 5th tab. Renders `SearchView` in the `.bottomNavTab` context, which
    /// omits the custom search field (the system `.searchable` is the field) and
    /// reuses `SearchViewModel` → `GET /api/search?q=` across all four entities
    /// (spec R1/R4/R6). The view model is injected from the layout so it can be
    /// cleared on tab exit (spec R7).
    @ViewBuilder
    private var searchTabContent: some View {
        NavigationStack(path: $searchPath) {
            SearchView(context: .bottomNavTab, viewModel: searchViewModel)
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
        let oldTab = selectedTab
        let effect = resolveTabChange(current: oldTab, next: newTab)
        if let resetTab = effect.resetTab {
            resetPath(for: resetTab)
        }
        // PR2 task 2.4 — clear the search text when LEAVING the `.search` tab
        // (spec R7: "Text MUST clear on tab exit"). This is the single chokepoint
        // both `ios26TabSelection` and `legacyTabSelection` route through, so the
        // clear fires reliably for every user-initiated tab change in BOTH
        // branches. The leave-decision is pure (`shouldClearSearchOnTabExit`).
        if shouldClearSearchOnTabExit(current: oldTab, next: newTab) {
            searchViewModel.clearSearch()
        }
        selectedTab = newTab
    }

    // MARK: - Helpers

    private func resetPath(for tab: Tab) {
        switch tab {
        case .home:     homePath = NavigationPath()
        case .events:   eventsPath = NavigationPath()
        case .clients:  clientsPath = NavigationPath()
        case .more:     morePath = NavigationPath()
        case .search:   searchPath = NavigationPath()
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
    CompactTabLayout(apiClient: APIClient(baseURL: URL(string: "https://example.com")!), pendingSpotlightRoute: .constant(nil))
}
