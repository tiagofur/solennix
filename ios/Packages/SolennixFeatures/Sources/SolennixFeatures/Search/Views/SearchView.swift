import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Search View

public struct SearchView: View {

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: SearchViewModel?

    public init() {}

    public var body: some View {
        Group {
            if let vm = viewModel {
                searchContent(vm: vm)
            } else {
                ProgressView()
                    .tint(SolennixColors.primary)
            }
        }
        .navigationTitle("Buscar")
        .navigationBarTitleDisplayMode(.large)
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
        .onAppear {
            if viewModel == nil, let client = authManager.apiClient {
                viewModel = SearchViewModel(apiClient: client)
            }
        }
    }

    @ViewBuilder
    private func searchContent(vm: SearchViewModel) -> some View {
        List {
            if vm.isLoading {
                loadingSection
            } else if vm.hasSearched && vm.isEmpty {
                noResultsSection
            } else if let results = vm.results, !results.isEmpty {
                resultsContent(results: results)
            } else {
                initialStateSection
            }
        }
        .listStyle(.insetGrouped)
        .searchable(
            text: Binding(
                get: { vm.query },
                set: { vm.query = $0 }
            ),
            prompt: "Clientes, eventos, productos..."
        )
        .onChange(of: vm.query) {
            Task { await vm.search() }
        }
    }

    // MARK: - Loading

    private var loadingSection: some View {
        Section {
            HStack(spacing: Spacing.md) {
                ProgressView()
                    .tint(SolennixColors.primary)
                Text("Buscando...")
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .center)
            .listRowBackground(SolennixColors.card)
        }
    }

    // MARK: - No Results

    private var noResultsSection: some View {
        Section {
            VStack(spacing: Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 40))
                    .foregroundStyle(SolennixColors.textTertiary)

                Text("Sin resultados")
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Text("Intenta con otro termino de busqueda")
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xxl)
            .listRowBackground(SolennixColors.card)
        }
    }

    // MARK: - Initial State

    private var initialStateSection: some View {
        Section {
            VStack(spacing: Spacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 40))
                    .foregroundStyle(SolennixColors.textTertiary)

                Text("Busca clientes, eventos, productos o inventario")
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xxl)
            .listRowBackground(SolennixColors.card)
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
                        title: "Clientes",
                        icon: "person.2.fill",
                        count: results.clients.count,
                        items: results.clients
                    ) { item in Route.clientDetail(id: item.id) }
                }

                if !results.events.isEmpty {
                    resultGridCard(
                        title: "Eventos",
                        icon: "calendar",
                        count: results.events.count,
                        items: results.events
                    ) { item in Route.eventDetail(id: item.id) }
                }

                if !results.products.isEmpty {
                    resultGridCard(
                        title: "Productos",
                        icon: "shippingbox.fill",
                        count: results.products.count,
                        items: results.products
                    ) { item in Route.productDetail(id: item.id) }
                }

                if !results.inventory.isEmpty {
                    resultGridCard(
                        title: "Inventario",
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
                Text("+ \(items.count - 5) mas")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                    .padding(.top, Spacing.xxs)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - iPhone Results List

    @ViewBuilder
    private func iPhoneResultsList(results: SearchResults) -> some View {
        if !results.clients.isEmpty {
            resultSection(
                title: "Clientes",
                icon: "person.2.fill",
                count: results.clients.count,
                items: results.clients
            ) { item in
                Route.clientDetail(id: item.id)
            }
        }

        if !results.events.isEmpty {
            resultSection(
                title: "Eventos",
                icon: "calendar",
                count: results.events.count,
                items: results.events
            ) { item in
                Route.eventDetail(id: item.id)
            }
        }

        if !results.products.isEmpty {
            resultSection(
                title: "Productos",
                icon: "shippingbox.fill",
                count: results.products.count,
                items: results.products
            ) { item in
                Route.productDetail(id: item.id)
            }
        }

        if !results.inventory.isEmpty {
            resultSection(
                title: "Inventario",
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
                .listRowBackground(SolennixColors.card)
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
