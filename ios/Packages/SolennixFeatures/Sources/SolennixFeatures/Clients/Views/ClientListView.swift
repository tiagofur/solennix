import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork
import TipKit

// MARK: - Client List View

public struct ClientListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: ClientListViewModel
    @Environment(\.openURL) private var openURL
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @Environment(\.apiClient) private var apiClient
    @Environment(CacheManager.self) private var cacheManager: CacheManager?
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: ClientListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        mainList
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle(String(localized: "clients.title", defaultValue: "Clientes", bundle: .module))
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchText, prompt: String(localized: "clients.search_placeholder", defaultValue: "Buscar clientes", bundle: .module))
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 0) {
                    if viewModel.isShowingCachedData {
                        CachedDataBanner()
                    }
                    if !planLimitsManager.canCreateClient {
                        UpgradeBannerView(
                            type: .limitReached,
                            resource: String(localized: "clients.title", defaultValue: "Clientes", bundle: .module),
                            currentUsage: planLimitsManager.clientsCount,
                            limit: PlanLimitsManager.clientLimit
                        ) {
                            // Action to go to Pricing
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.top, Spacing.sm)
                    }
                }
                .background(SolennixColors.surfaceGrouped)
            }
            .refreshable { await viewModel.loadClients() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: Spacing.sm) {
                        NavigationLink(value: Route.clientForm()) {
                            Image(systemName: "plus")
                                .font(.body)
                                .foregroundStyle(planLimitsManager.canCreateClient ? SolennixColors.primary : SolennixColors.textTertiary)
                                .accessibilityLabel(String(localized: "clients.action.add", defaultValue: "Agregar cliente", bundle: .module))
                        }
                        .disabled(!planLimitsManager.canCreateClient)

                        sortMenu
                    }
                }
            }
            .confirmationDialog(
                String(localized: "clients.delete.title", defaultValue: "Eliminar cliente", bundle: .module),
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { client in
                Button(String(localized: "clients.delete.confirm", defaultValue: "Eliminar", bundle: .module), role: .destructive) {
                    HapticsHelper.play(.success)
                    guard let removed = viewModel.softDeleteClient(client) else { return }
                    toastManager.showUndo(
                        message: String(localized: "clients.delete.undo_message", defaultValue: "\(client.name) eliminado", bundle: .module),
                        onUndo: {
                            viewModel.restoreClient(removed.client, at: removed.index)
                            HapticsHelper.play(.success)
                        },
                        onExpire: {
                            Task { await viewModel.confirmDeleteClient(removed.client) }
                        }
                    )
                }
                Button(String(localized: "clients.delete.cancel", defaultValue: "Cancelar", bundle: .module), role: .cancel) {}
            } message: { client in
                Text(String(localized: "clients.delete.message", defaultValue: "Se eliminará a \(client.name). Podrás deshacer durante unos segundos.", bundle: .module))
            }
            .task {
                viewModel.setCacheManager(cacheManager)
                await viewModel.loadClients()
                await planLimitsManager.checkLimits()
            }
    }

    // MARK: - Main List (single scroll container, always present)

    @ViewBuilder
    private var mainList: some View {
        if sizeClass == .regular {
            clientGrid
                .overlay { stateOverlay }
        } else {
            clientListCompact
        }
    }

    /// State overlay used by the iPad grid — shows loading/empty/error above the grid.
    @ViewBuilder
    private var stateOverlay: some View {
        if let error = viewModel.errorMessage, viewModel.clients.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: String(localized: "clients.error.load_title", defaultValue: "Error al cargar", bundle: .module),
                message: error,
                actionTitle: String(localized: "clients.action.retry", defaultValue: "Reintentar", bundle: .module)
            ) {
                Task { await viewModel.loadClients() }
            }
            .background(SolennixColors.surfaceGrouped)
        } else if viewModel.isLoading && viewModel.clients.isEmpty {
            ProgressView()
                .controlSize(.large)
                .tint(SolennixColors.primary)
        } else if viewModel.filteredClients.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty {
                EmptyStateView(
                    icon: "person.2",
                    title: String(localized: "clients.empty.title", defaultValue: "Sin clientes", bundle: .module),
                    message: String(localized: "clients.empty.message", defaultValue: "Agregá tu primer cliente para empezar", bundle: .module),
                    actionTitle: String(localized: "clients.action.add", defaultValue: "Agregar cliente", bundle: .module)
                ) {
                    // FAB handles navigation
                }
                .background(SolennixColors.surfaceGrouped)
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: String(localized: "clients.search.empty_title", defaultValue: "Sin resultados", bundle: .module),
                    message: String(localized: "clients.search.empty_message", defaultValue: "No se encontraron clientes que coincidan con tu búsqueda", bundle: .module)
                )
                .background(SolennixColors.surfaceGrouped)
            }
        }
    }

    private var clientGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.sm) {
                ForEach(viewModel.paginatedClients) { client in
                    NavigationLink(value: Route.clientDetail(id: client.id)) {
                        clientRow(client)
                            .padding(Spacing.md)
                            .background(SolennixColors.card)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .shadowSm()
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        NavigationLink(value: Route.clientForm(id: client.id)) {
                            Label(String(localized: "clients.action.edit", defaultValue: "Editar", bundle: .module), systemImage: "pencil")
                        }
                        if !client.phone.isEmpty {
                            Button {
                                if let url = URL(string: "tel:\(client.phone)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(String(localized: "clients.action.call", defaultValue: "Llamar", bundle: .module), systemImage: "phone")
                            }
                        }
                        if let email = client.email, !email.isEmpty {
                            Button {
                                if let url = URL(string: "mailto:\(email)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(String(localized: "clients.form.email", defaultValue: "Email", bundle: .module), systemImage: "envelope")
                            }
                        }
                        Divider()
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = client
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(String(localized: "clients.delete.confirm", defaultValue: "Eliminar", bundle: .module), systemImage: "trash")
                        }
                    }
                    .task {
                        if client == viewModel.paginatedClients.last {
                            await viewModel.loadMore()
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.xxl)

            if viewModel.hasMorePages {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, Spacing.md)
            }
        }
        .background(SolennixColors.surfaceGrouped)
    }

    @ViewBuilder
    private var clientListCompact: some View {
        List {
            if let error = viewModel.errorMessage, viewModel.clients.isEmpty, !viewModel.isLoading {
                fullPageEmptyRow(
                    icon: "wifi.exclamationmark",
                    title: String(localized: "clients.error.load_title", defaultValue: "Error al cargar", bundle: .module),
                    message: error,
                    actionTitle: String(localized: "clients.action.retry", defaultValue: "Reintentar", bundle: .module)
                ) {
                    Task { await viewModel.loadClients() }
                }
            } else if viewModel.isLoading && viewModel.clients.isEmpty {
                skeletonRows
            } else if viewModel.filteredClients.isEmpty && !viewModel.isLoading {
                if viewModel.searchText.isEmpty {
                    fullPageEmptyRow(
                        icon: "person.2",
                        title: String(localized: "clients.empty.title", defaultValue: "Sin clientes", bundle: .module),
                        message: String(localized: "clients.empty.message", defaultValue: "Agregá tu primer cliente para empezar", bundle: .module),
                        actionTitle: String(localized: "clients.action.add", defaultValue: "Agregar cliente", bundle: .module)
                    ) {
                        // FAB handles navigation
                    }
                } else {
                    fullPageEmptyRow(
                        icon: "magnifyingglass",
                        title: String(localized: "clients.search.empty_title", defaultValue: "Sin resultados", bundle: .module),
                        message: String(localized: "clients.search.empty_message", defaultValue: "No se encontraron clientes que coincidan con tu búsqueda", bundle: .module),
                        actionTitle: nil,
                        action: nil
                    )
                }
            } else {
                ForEach(viewModel.paginatedClients) { client in
                    NavigationLink(value: Route.clientDetail(id: client.id)) {
                        clientRow(client)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = client
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(String(localized: "clients.delete.confirm", defaultValue: "Eliminar", bundle: .module), systemImage: "trash")
                        }

                        NavigationLink(value: Route.clientForm(id: client.id)) {
                            Label(String(localized: "clients.action.edit", defaultValue: "Editar", bundle: .module), systemImage: "pencil")
                        }
                        .tint(.blue)
                    }
                    .swipeActions(edge: .leading, allowsFullSwipe: true) {
                        if let email = client.email, !email.isEmpty,
                           let url = URL(string: "mailto:\(email)") {
                            Button {
                                HapticsHelper.play(.success)
                                openURL(url)
                            } label: {
                                Label(String(localized: "clients.form.email", defaultValue: "Email", bundle: .module), systemImage: "envelope.fill")
                            }
                            .tint(.blue)
                        }

                        if !client.phone.isEmpty,
                           let url = URL(string: "tel:\(client.phone)") {
                            Button {
                                HapticsHelper.play(.success)
                                openURL(url)
                            } label: {
                                Label(String(localized: "clients.action.call", defaultValue: "Llamar", bundle: .module), systemImage: "phone.fill")
                            }
                            .tint(.green)
                        }
                    }
                    .contextMenu {
                        NavigationLink(value: Route.clientForm(id: client.id)) {
                            Label(String(localized: "clients.action.edit", defaultValue: "Editar", bundle: .module), systemImage: "pencil")
                        }
                        if !client.phone.isEmpty {
                            Button {
                                if let url = URL(string: "tel:\(client.phone)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(String(localized: "clients.action.call", defaultValue: "Llamar", bundle: .module), systemImage: "phone")
                            }
                        }
                        if let email = client.email, !email.isEmpty {
                            Button {
                                if let url = URL(string: "mailto:\(email)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(String(localized: "clients.form.email", defaultValue: "Email", bundle: .module), systemImage: "envelope")
                            }
                        }
                        Divider()
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = client
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(String(localized: "clients.delete.confirm", defaultValue: "Eliminar", bundle: .module), systemImage: "trash")
                        }
                    }
                    .task {
                        if client == viewModel.paginatedClients.last {
                            await viewModel.loadMore()
                        }
                    }
                }

                if viewModel.hasMorePages {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    /// Skeleton placeholder rows shown while clients are loading for the first time.
    @ViewBuilder
    private var skeletonRows: some View {
        ForEach(0..<5, id: \.self) { _ in
            HStack(spacing: Spacing.md) {
                Circle()
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 40, height: 40)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 140, height: 14)

                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 100, height: 10)
                }

                Spacer()
            }
            .padding(.vertical, Spacing.xs)
        }
        .redacted(reason: .placeholder)
    }

    /// Renders an `EmptyStateView` as a List row that fills the available space
    /// without List chrome (no background, no insets, no separator).
    private func fullPageEmptyRow(
        icon: String,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) -> some View {
        EmptyStateView(
            icon: icon,
            title: title,
            message: message,
            actionTitle: actionTitle,
            action: action
        )
        .frame(maxWidth: .infinity)
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())
        .listRowSeparator(.hidden)
    }

    // MARK: - Client Row

    private func clientRow(_ client: Client) -> some View {
        HStack(spacing: Spacing.md) {
            Avatar(name: client.name, photoURL: client.photoUrl, size: 40)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(client.name)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let city = client.city, !city.isEmpty {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "mappin")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                        Text(city)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                HStack(spacing: Spacing.sm) {
                    if !client.phone.isEmpty {
                        Text(client.phone)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    if let email = client.email, !email.isEmpty {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Sort Menu

    private var sortMenu: some View {
        Menu {
            Picker(String(localized: "clients.sort.title", defaultValue: "Ordenar por", bundle: .module), selection: $viewModel.sortKey) {
                ForEach(ClientSortKey.allCases, id: \.self) { key in
                    Text(key.label).tag(key)
                }
            }

            Divider()

            Button {
                viewModel.sortAscending.toggle()
            } label: {
                Label(
                    viewModel.sortAscending
                        ? String(localized: "clients.sort.ascending", defaultValue: "Ascendente", bundle: .module)
                        : String(localized: "clients.sort.descending", defaultValue: "Descendente", bundle: .module),
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .accessibilityLabel(String(localized: "clients.sort.accessibility", defaultValue: "Ordenar clientes", bundle: .module))
        }
    }

}

// MARK: - Preview

#Preview("Client List") {
    NavigationStack {
        ClientListView(apiClient: APIClient())
    }
}
