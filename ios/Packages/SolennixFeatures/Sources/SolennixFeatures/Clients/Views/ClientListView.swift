import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork
import TipKit

// MARK: - Client List View

public struct ClientListView: View {

    @State private var viewModel: ClientListViewModel
    @State private var showQuickQuote = false
    @Environment(\.openURL) private var openURL
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @Environment(\.apiClient) private var apiClient

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: ClientListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
        .navigationTitle("Clientes")
        .searchable(text: $viewModel.searchText, prompt: "Buscar clientes...")
        .refreshable { await viewModel.loadClients() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    Button {
                        showQuickQuote = true
                    } label: {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                    }

                    NavigationLink(value: Route.clientForm()) {
                        Image(systemName: "plus.circle")
                            .font(.body)
                            .foregroundStyle(planLimitsManager.canCreateClient ? SolennixColors.primary : SolennixColors.textTertiary)
                    }
                    .disabled(!planLimitsManager.canCreateClient)

                    sortMenu
                }
            }
        }
        .sheet(isPresented: $showQuickQuote) {
            QuickQuoteView(apiClient: apiClient)
                .presentationDetents([.large])
        }
        .confirmationDialog(
            "Eliminar cliente",
            isPresented: $viewModel.showDeleteConfirm,
            presenting: viewModel.deleteTarget
        ) { client in
            Button("Eliminar", role: .destructive) {
                HapticsHelper.play(.success)
                Task { await viewModel.deleteClient(client) }
            }
            Button("Cancelar", role: .cancel) {}
        } message: { client in
            Text("Estas seguro de que quieres eliminar a \(client.name)? Esta accion no se puede deshacer.")
        }
        .task { 
            await viewModel.loadClients()
            await planLimitsManager.checkLimits()
        }
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

            if viewModel.isLoading && viewModel.clients.isEmpty {
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

    private var clientList: some View {
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
                .onAppear {
                    if client == viewModel.paginatedClients.last {
                        viewModel.loadMore()
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
        .listStyle(.plain)
        .popoverTip(SwipeActionTip(), arrowEdge: .top)
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
        .listStyle(.plain)
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
        }
    }

}

// MARK: - Preview

#Preview("Client List") {
    NavigationStack {
        ClientListView(apiClient: APIClient())
    }
}
