import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Search Presentation Context

/// How `SearchView` is being presented.
///
/// - `.pushed`: the classic global-search route pushed onto a navigation stack
///   (`Route.search(query:)`). Renders its own custom search field + suggestions
///   surface; the nav bar seeds `initialQuery` only.
/// - `.bottomNavTab`: the search destination rendered in-tab inside the bottom
///   nav (PR2). OMITS the custom search field — the system `.searchable` (wired
///   by `CompactTabLayout.searchTabContent`) is the input field — and renders a
///   structured BLANK empty surface (no recents) per spec R6. `SearchViewModel`
///   owns `query` in both contexts (design Decision 2).
public enum SearchPresentationContext {
    case pushed
    case bottomNavTab
}

// MARK: - Search View

public struct SearchView: View {

    private let initialQuery: String
    /// The presentation context the view was constructed with. Public so callers
    /// (and tests) can confirm which surface is in use.
    public let presentationContext: SearchPresentationContext
    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: SearchViewModel?
    @FocusState private var isSearchFocused: Bool

    @ScaledMetric(relativeTo: .largeTitle) private var illustrationIconSize: CGFloat = 40

    /// - Parameters:
    ///   - initialQuery: Optional seed query (pushed route). `SearchViewModel`
    ///     remains the text owner; this is an initial value only (spec R7).
    ///   - context: Presentation surface. Defaults to `.pushed` so existing
    ///     `Route.search` callers are unchanged.
    ///   - viewModel: Optional injected view model. When provided (bottom-nav
    ///     tab) the view uses it directly; otherwise it lazily builds one from
    ///     the environment API client on first appear (existing pushed behavior).
    public init(
        initialQuery: String = "",
        context: SearchPresentationContext = .pushed,
        viewModel: SearchViewModel? = nil
    ) {
        self.initialQuery = initialQuery
        self.presentationContext = context
        self._viewModel = State(initialValue: viewModel)
    }

    public var body: some View {
        switch presentationContext {
        case .pushed:
            searchSurface
        case .bottomNavTab:
            // The system `.searchable` is the input field for the bottom-nav tab
            // (spec R1/R6); the custom `searchField` is omitted (see searchContent).
            // `SearchViewModel` owns `query` (design Decision 2); typing triggers a
            // debounced `GET /api/search?q=` via `searchTabQueryBinding`.
            searchSurface
                .searchable(text: searchTabQueryBinding, prompt: Text(CommonStrings.globalSearchPrompt))
        }
    }

    /// Shared chrome (title, background, lazy view-model setup) for both contexts.
    @ViewBuilder
    private var searchSurface: some View {
        Group {
            if let vm = viewModel {
                searchContent(vm: vm)
            } else {
                ProgressView()
                    .tint(SolennixColors.primary)
            }
        }
        .navigationTitle(SearchStrings.title)
        .navigationBarTitleDisplayMode(.inline)
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
        .onAppear {
            if viewModel == nil, let client = authManager.apiClient {
                let model = SearchViewModel(apiClient: client)
                viewModel = model

                let trimmedInitialQuery = initialQuery.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmedInitialQuery.isEmpty {
                    model.query = trimmedInitialQuery
                    Task { await model.search() }
                }
            }

            isSearchFocused = initialQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    /// Binding for the bottom-nav tab's system `.searchable` field. The injected
    /// `SearchViewModel` owns `query` (design Decision 2); each edit triggers a
    /// debounced search (debounce lives inside `SearchViewModel.search()`).
    private var searchTabQueryBinding: Binding<String> {
        Binding(
            get: { viewModel?.query ?? "" },
            set: { newValue in
                guard let vm = viewModel else { return }
                vm.query = newValue
                Task { await vm.search() }
            }
        )
    }

    @ViewBuilder
    private func searchContent(vm: SearchViewModel) -> some View {
        switch presentationContext {
        case .pushed:
            // Pushed route: always-visible custom search field + results/suggestions.
            VStack(spacing: 0) {
                searchField(vm: vm)
                resultList(vm: vm)
            }
        case .bottomNavTab:
            // Bottom-nav tab (PR2): the system `.searchable` (wired by
            // `CompactTabLayout.searchTabContent`) is the input field, so the
            // custom `searchField` is omitted. Results reuse `SearchViewModel`
            // → GET /api/search?q= across all four entities (spec R4/R6). An
            // empty query renders a structured BLANK surface (no recents) so
            // future enhancements can land without redesign (spec R6).
            resultList(vm: vm)
        }
    }

    /// Shared results list for both presentation contexts. The empty/suggestion
    /// surfaces are gated to `.pushed` so the bottom-nav tab stays blank until
    /// the user types (spec R6).
    @ViewBuilder
    private func resultList(vm: SearchViewModel) -> some View {
        List {
            if vm.isLoading {
                loadingSection
            } else if vm.hasSearched && vm.isEmpty {
                noResultsSection
            } else if let results = vm.results, !results.isEmpty {
                resultsContent(results: results)
            } else if presentationContext == .pushed, !vm.querySuggestions.isEmpty {
                suggestionsSection(vm: vm)
            } else if presentationContext == .pushed, !vm.hasSearched {
                initialStateSection
            }
            // `.bottomNavTab` with empty query: no section renders → blank surface.
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
    }

    // MARK: - Search Field

    private func searchField(vm: SearchViewModel) -> some View {
        return HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.body)
                .foregroundStyle(SolennixColors.textTertiary)

            TextField(
                SearchStrings.placeholder,
                text: Binding(
                    get: { vm.query },
                    set: { newValue in
                        vm.query = newValue
                        Task { await vm.search() }
                    }
                )
            )
            .font(.body)
            .foregroundStyle(SolennixColors.text)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
            .focused($isSearchFocused)

            if !vm.query.isEmpty {
                Button {
                    vm.clearSearch()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        }
        .padding(Spacing.md)
        .solennixCard(border: false)
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Loading

    private var loadingSection: some View {
        Section {
            HStack(spacing: Spacing.md) {
                ProgressView()
                    .tint(SolennixColors.primary)
                Text(SearchStrings.loading)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .center)
            .solennixRow()
        }
    }

    // MARK: - No Results

    private var noResultsSection: some View {
        Section {
            VStack(spacing: Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: illustrationIconSize))
                    .foregroundStyle(SolennixColors.textTertiary)

                Text(SearchStrings.noResultsTitle)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Text(SearchStrings.noResultsSubtitle)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xxl)
            .solennixRow()
        }
    }

    // MARK: - Initial State

    private var initialStateSection: some View {
        Section {
            VStack(spacing: Spacing.md) {
                Image(systemName: "text.magnifyingglass")
                    .font(.system(size: illustrationIconSize))
                    .foregroundStyle(SolennixColors.textTertiary)

                Text(SearchStrings.initialStateHint)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xxl)
            .solennixRow()
        }
    }

    private func suggestionsSection(vm: SearchViewModel) -> some View {
        Section {
            ForEach(vm.querySuggestions, id: \.self) { suggestion in
                Button {
                    vm.applySuggestion(suggestion)
                    Task { await vm.search() }
                } label: {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                        Text(suggestion)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.text)
                        Spacer()
                    }
                }
                .solennixRow()
            }
        } header: {
            HStack {
                Text(SearchStrings.suggestionsTitle)
                Spacer()
                if !vm.recentQueries.isEmpty {
                    Button(SearchStrings.suggestionsClear) {
                        vm.clearRecentQueries()
                    }
                    .font(.caption)
                }
            }
        }
    }

    // MARK: - Results Content

    @ViewBuilder
    private func resultsContent(results: SearchResults) -> some View {
        if sizeClass == .regular {
            iPadResultsGrid(results: results)
        } else {
            iPhoneResultsList(results: results)
        }
    }

    // MARK: - iPad Results Grid (2x2)

    @ViewBuilder
    private func iPadResultsGrid(results: SearchResults) -> some View {
        Section {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: Spacing.md),
                    GridItem(.flexible(), spacing: Spacing.md)
                ],
                spacing: Spacing.md
            ) {
                if !results.clients.isEmpty {
                    resultGridCard(
                        title: SearchStrings.resultsClients,
                        icon: "person.2.fill",
                        count: results.clients.count,
                        items: results.clients
                    ) { item in Route.clientDetail(id: item.id) }
                }

                if !results.events.isEmpty {
                    resultGridCard(
                        title: SearchStrings.resultsEvents,
                        icon: "calendar",
                        count: results.events.count,
                        items: results.events
                    ) { item in Route.eventDetail(id: item.id) }
                }

                if !results.products.isEmpty {
                    resultGridCard(
                        title: SearchStrings.resultsProducts,
                        icon: "shippingbox.fill",
                        count: results.products.count,
                        items: results.products
                    ) { item in Route.productDetail(id: item.id) }
                }

                if !results.inventory.isEmpty {
                    resultGridCard(
                        title: SearchStrings.resultsInventory,
                        icon: "archivebox.fill",
                        count: results.inventory.count,
                        items: results.inventory
                    ) { item in Route.inventoryDetail(id: item.id) }
                }
            }
            .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.sm, bottom: Spacing.sm, trailing: Spacing.sm))
            .listRowBackground(Color.clear)
        }
    }

    private func resultGridCard(
        title: String,
        icon: String,
        count: Int,
        items: [SearchResultItem],
        routeBuilder: @escaping (SearchResultItem) -> Route
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Spacer()

                Text("\(count)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xxs)
                    .background(SolennixColors.surfaceAlt)
                    .clipShape(Capsule())
            }

            Divider()

            // Items
            ForEach(items.prefix(5)) { item in
                NavigationLink(value: routeBuilder(item)) {
                    resultRow(item: item)
                }
            }

            if items.count > 5 {
                Text(SearchStrings.more(items.count - 5))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                    .padding(.top, Spacing.xxs)
            }
        }
        .padding(Spacing.md)
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
    }

    // MARK: - iPhone Results List

    @ViewBuilder
    private func iPhoneResultsList(results: SearchResults) -> some View {
        if !results.clients.isEmpty {
            resultSection(
                title: SearchStrings.resultsClients,
                icon: "person.2.fill",
                count: results.clients.count,
                items: results.clients
            ) { item in
                Route.clientDetail(id: item.id)
            }
        }

        if !results.events.isEmpty {
            resultSection(
                title: SearchStrings.resultsEvents,
                icon: "calendar",
                count: results.events.count,
                items: results.events
            ) { item in
                Route.eventDetail(id: item.id)
            }
        }

        if !results.products.isEmpty {
            resultSection(
                title: SearchStrings.resultsProducts,
                icon: "shippingbox.fill",
                count: results.products.count,
                items: results.products
            ) { item in
                Route.productDetail(id: item.id)
            }
        }

        if !results.inventory.isEmpty {
            resultSection(
                title: SearchStrings.resultsInventory,
                icon: "archivebox.fill",
                count: results.inventory.count,
                items: results.inventory
            ) { item in
                Route.inventoryDetail(id: item.id)
            }
        }
    }

    // MARK: - Result Section

    private func resultSection(
        title: String,
        icon: String,
        count: Int,
        items: [SearchResultItem],
        routeBuilder: @escaping (SearchResultItem) -> Route
    ) -> some View {
        Section {
            ForEach(items) { item in
                NavigationLink(value: routeBuilder(item)) {
                    resultRow(item: item)
                }
                .solennixRow()
            }
        } header: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Text("\(count)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xxs)
                    .background(SolennixColors.surfaceAlt)
                    .clipShape(Capsule())
            }
        }
    }

    // MARK: - Result Row

    private func resultRow(item: SearchResultItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(item.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let subtitle = item.subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            Spacer()

            if let status = item.status {
                StatusBadge(status: status)
            } else if let meta = item.meta {
                Text(meta)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Preview

#Preview("Search") {
    NavigationStack {
        SearchView()
    }
    .environment(AuthManager())
}
