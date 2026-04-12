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
        VStack(spacing: 0) {
            if viewModel.isShowingCachedData {
                CachedDataBanner()
            }
            filterBar
            content
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Clientes")
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await viewModel.loadClients() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    NavigationLink(value: Route.clientForm()) {
                        Image(systemName: "plus")
                            .font(.body)
                            .foregroundStyle(planLimitsManager.canCreateClient ? SolennixColors.primary : SolennixColors.textTertiary)
                            .accessibilityLabel("Agregar cliente")
                    }
                    .disabled(!planLimitsManager.canCreateClient)

                    sortMenu
                }
            }
        }
        .confirmationDialog(
            "Eliminar cliente",
            isPresented: $viewModel.showDeleteConfirm,
            presenting: viewModel.deleteTarget
        ) { client in
            Button("Eliminar", role: .destructive) {
                HapticsHelper.play(.success)
                guard let removed = viewModel.softDeleteClient(client) else { return }
                toastManager.showUndo(
                    message: "\(client.name) eliminado",
                    onUndo: {
                        viewModel.restoreClient(removed.client, at: removed.index)
                        HapticsHelper.play(.success)
                    },
                    onExpire: {
                        Task { await viewModel.confirmDeleteClient(removed.client) }
                    }
                )
            }
            Button("Cancelar", role: .cancel) {}
        } message: { client in
            Text("Se eliminara a \(client.name). Podras deshacer durante unos segundos.")
        }
        .task {
            viewModel.setCacheManager(cacheManager)
            await viewModel.loadClients()
            await planLimitsManager.checkLimits()
        }
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        InlineFilterBar(
            placeholder: "Filtrar clientes por nombre o teléfono...",
            text: $viewModel.searchText
        )
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        VStack(spacing: 0) {
            if !planLimitsManager.canCreateClient {
                UpgradeBannerView(
                    type: .limitReached,
                    resource: "Clientes",
                    currentUsage: planLimitsManager.clientsCount,
                    limit: PlanLimitsManager.clientLimit
                ) {
                    // Action to go to Pricing
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)
            }

            if let error = viewModel.errorMessage, viewModel.clients.isEmpty, !viewModel.isLoading {
                EmptyStateView(
                    icon: "wifi.exclamationmark",
                    title: "Error al cargar",
                    message: error,
                    actionTitle: "Reintentar"
                ) {
                    Task { await viewModel.loadClients() }
                }
            } else if viewModel.isLoading && viewModel.clients.isEmpty {
                skeletonList
        } else if viewModel.filteredClients.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty {
                EmptyStateView(
                    icon: "person.2",
                    title: "Sin clientes",
                    message: "Agrega tu primer cliente para empezar",
                    actionTitle: "Agregar Cliente"
                ) {
                    // FAB handles navigation; empty state CTA is visual only
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: "Sin resultados",
                    message: "No se encontraron clientes que coincidan con tu busqueda"
                )
            }
        } else {
            clientList
        }
        } // End VStack
    }

    // MARK: - Client List

    @ViewBuilder
    private var clientList: some View {
        if sizeClass == .regular {
            clientGrid
        } else {
            clientListCompact
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
                            Label("Editar", systemImage: "pencil")
                        }
                        if !client.phone.isEmpty {
                            Button {
                                if let url = URL(string: "tel:\(client.phone)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label("Llamar", systemImage: "phone")
                            }
                        }
                        if let email = client.email, !email.isEmpty {
                            Button {
                                if let url = URL(string: "mailto:\(email)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label("Email", systemImage: "envelope")
                            }
                        }
                        Divider()
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = client
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label("Eliminar", systemImage: "trash")
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

    private var clientListCompact: some View {
        List {
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
                        Label("Eliminar", systemImage: "trash")
                    }

                    NavigationLink(value: Route.clientForm(id: client.id)) {
                        Label("Editar", systemImage: "pencil")
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
                            Label("Email", systemImage: "envelope.fill")
                        }
                        .tint(.blue)
                    }

                    if !client.phone.isEmpty,
                       let url = URL(string: "tel:\(client.phone)") {
                        Button {
                            HapticsHelper.play(.success)
                            openURL(url)
                        } label: {
                            Label("Llamar", systemImage: "phone.fill")
                        }
                        .tint(.green)
                    }
                }
                .contextMenu {
                    NavigationLink(value: Route.clientForm(id: client.id)) {
                        Label("Editar", systemImage: "pencil")
                    }
                    if !client.phone.isEmpty {
                        Button {
                            if let url = URL(string: "tel:\(client.phone)") {
                                openURL(url)
                            }
                            HapticsHelper.play(.success)
                        } label: {
                            Label("Llamar", systemImage: "phone")
                        }
                    }
                    if let email = client.email, !email.isEmpty {
                        Button {
                            if let url = URL(string: "mailto:\(email)") {
                                openURL(url)
                            }
                            HapticsHelper.play(.success)
                        } label: {
                            Label("Email", systemImage: "envelope")
                        }
                    }
                    Divider()
                    Button(role: .destructive) {
                        HapticsHelper.play(.warning)
                        viewModel.deleteTarget = client
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label("Eliminar", systemImage: "trash")
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
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
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

    // MARK: - Skeleton Loading

    private var skeletonList: some View {
        List(0..<5, id: \.self) { _ in
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
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .redacted(reason: .placeholder)
    }

    // MARK: - Sort Menu

    private var sortMenu: some View {
        Menu {
            Picker("Ordenar por", selection: $viewModel.sortKey) {
                ForEach(ClientSortKey.allCases, id: \.self) { key in
                    Text(key.label).tag(key)
                }
            }

            Divider()

            Button {
                viewModel.sortAscending.toggle()
            } label: {
                Label(
                    viewModel.sortAscending ? "Ascendente" : "Descendente",
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .accessibilityLabel("Ordenar clientes")
        }
    }

}

// MARK: - Preview

#Preview("Client List") {
    NavigationStack {
        ClientListView(apiClient: APIClient())
    }
}
