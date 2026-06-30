import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork
import TipKit

// MARK: - Client List View

public struct ClientListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var viewModel: ClientListViewModel
    @Environment(\.openURL) private var openURL
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @Environment(\.apiClient) private var apiClient
    @Environment(CacheManager.self) private var cacheManager: CacheManager?
    @Environment(ToastManager.self) private var toastManager

    // TipKit tip
    private let swipeActionTip = SwipeActionTip()

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: ClientListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        mainList
            .background(SolennixColors.surfaceGrouped)
            // Haptic feedback when the destructive delete confirmation appears (true only).
            .sensoryFeedback(.warning, trigger: viewModel.showDeleteConfirm) { _, newValue in newValue }
            .navigationTitle(tr("clients.title", "Clientes"))
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchText, prompt: tr("clients.search_placeholder", "Buscar clientes"))
            .searchMinimizedIfAvailable()
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 0) {
                    if viewModel.isShowingCachedData {
                        CachedDataBanner()
                    }
                    if !planLimitsManager.canCreateClient {
                        NavigationLink(value: Route.pricing) {
                            UpgradeBannerView(
                                type: .limitReached,
                                resource: tr("clients.title", "Clientes"),
                                currentUsage: planLimitsManager.clientsCount,
                                limit: PlanLimitsManager.clientLimit
                            )
                        }
                        .buttonStyle(.plain)
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
                                .accessibilityLabel(tr("clients.action.add", "Agregar cliente"))
                        }
                        .disabled(!planLimitsManager.canCreateClient)

                        sortMenu
                    }
                }
            }
            .confirmationDialog(
                tr("clients.delete.title", "Eliminar cliente"),
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { client in
                Button(tr("clients.delete.confirm", "Eliminar"), role: .destructive) {
                    guard let removed = viewModel.softDeleteClient(client) else { return }
                    HapticsHelper.play(.success)
                    toastManager.showUndo(
                        message: trf("clients.delete.undo_message", "\(client.name) eliminado", client.name),
                        onUndo: {
                            viewModel.restoreClient(removed.client, at: removed.index)
                            HapticsHelper.play(.success)
                        },
                        onExpire: {
                            Task { await viewModel.confirmDeleteClient(removed.client) }
                        }
                    )
                }
                Button(tr("clients.delete.cancel", "Cancelar"), role: .cancel) {}
            } message: { client in
                Text(trf("clients.delete.message", "Se eliminará a \(client.name). Podrás deshacer durante unos segundos.", client.name))
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
                title: tr("clients.error.load_title", "Error al cargar"),
                message: error,
                actionTitle: tr("clients.action.retry", "Reintentar"),
                iconColor: SolennixColors.primary
            ) {
                Task { await viewModel.loadClients() }
            }
            .background(SolennixColors.surfaceGrouped)
        } else if viewModel.isLoading && viewModel.clients.isEmpty {
            ProgressView()
                .controlSize(.large)
        } else if viewModel.filteredClients.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty {
                // First-run: real NavigationLink CTA styled like EventListView first-run.
                VStack(spacing: 0) {
                    EmptyStateView(
                        icon: "person.2",
                        title: tr("clients.empty.title", "Sin clientes"),
                        message: tr("clients.empty.message", "Agregá tu primer cliente para empezar"),
                        iconColor: SolennixColors.primary
                    )
                    NavigationLink(value: Route.clientForm()) {
                        Text(tr("clients.empty.cta", "Agregar cliente"))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.primaryDark)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.vertical, 16)
                            .background(SolennixColors.primaryLight)
                            .clipShape(Capsule())
                            .adaptiveGlass(in: Capsule(), fallback: .material)
                    }
                    .padding(.bottom, Spacing.xxl)
                }
                .background(SolennixColors.surfaceGrouped)
            } else {
                ContentUnavailableView.search(text: viewModel.searchText)
                    .background(SolennixColors.surfaceGrouped)
            }
        }
    }

    /// First-run empty state for the iPhone list with a working NavigationLink CTA.
    /// Mirrors EventListView's first-run empty state pattern.
    /// Outside List for proper vertical centering.
    private var clientFirstRunEmptyState: some View {
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "person.2",
                title: tr("clients.empty.title", "Sin clientes"),
                message: tr("clients.empty.message", "Agregá tu primer cliente para empezar"),
                iconColor: SolennixColors.primary
            )
            NavigationLink(value: Route.clientForm()) {
                Text(tr("clients.empty.cta", "Agregar cliente"))
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primaryDark)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                    .adaptiveGlass(in: Capsule(), fallback: .material)
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
    }

    private var clientGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.lg) {
                ForEach(viewModel.paginatedClients) { client in
                    NavigationLink(value: Route.clientDetail(id: client.id)) {
                        clientRow(client)
                    }
                    .buttonStyle(.plain)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(clientAccessibilityLabel(client))
                    .accessibilityAddTraits(.isButton)
                    .contextMenu {
                        NavigationLink(value: Route.clientForm(id: client.id)) {
                            Label(tr("clients.action.edit", "Editar"), systemImage: "pencil")
                        }
                        if !client.phone.isEmpty {
                            Button {
                                if let url = URL(string: "tel:\(client.phone)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(tr("clients.action.call", "Llamar"), systemImage: "phone")
                            }
                        }
                        if let email = client.email, !email.isEmpty {
                            Button {
                                if let url = URL(string: "mailto:\(email)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(tr("clients.form.email", "Email"), systemImage: "envelope")
                            }
                        }
                        Divider()
                        Button(role: .destructive) {
                            viewModel.deleteTarget = client
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(tr("clients.delete.confirm", "Eliminar"), systemImage: "trash")
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
        if let error = viewModel.errorMessage, viewModel.clients.isEmpty, !viewModel.isLoading {
            // Error state — outside List for proper centering
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: tr("clients.error.load_title", "Error al cargar"),
                message: error,
                actionTitle: tr("clients.action.retry", "Reintentar"),
                iconColor: SolennixColors.primary
            ) {
                Task { await viewModel.loadClients() }
            }
        } else if viewModel.isLoading && viewModel.clients.isEmpty {
            List {
                skeletonRows
            }
            .listStyle(.insetGrouped)
            .solennixListStyle()
            .popoverTip(swipeActionTip)
        } else if viewModel.filteredClients.isEmpty && !viewModel.isLoading {
            // Empty states — outside List for proper centering
            if viewModel.searchText.isEmpty {
                // First-run: real NavigationLink CTA
                clientFirstRunEmptyState
            } else {
                ContentUnavailableView.search(text: viewModel.searchText)
            }
        } else {
            List {
                ForEach(viewModel.paginatedClients) { client in
                    ZStack {
                        clientRow(client)
                        NavigationLink(value: Route.clientDetail(id: client.id)) {
                            EmptyView()
                        }
                        .opacity(0)
                    }
                    .solennixRow()
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                    .alignmentGuide(.listRowSeparatorLeading) { d in d[.leading] + 40 + Spacing.md }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(clientAccessibilityLabel(client))
                    .accessibilityAddTraits(.isButton)
                    // Delete is reachable via swipe; wire an explicit action so
                    // VoiceOver users can trigger it through the rotor — mirrors EventListView.
                    .accessibilityAction(named: tr("clients.delete.confirm", "Eliminar")) {
                        viewModel.deleteTarget = client
                        viewModel.showDeleteConfirm = true
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            viewModel.deleteTarget = client
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(tr("clients.delete.confirm", "Eliminar"), systemImage: "trash")
                        }

                        NavigationLink(value: Route.clientForm(id: client.id)) {
                            Label(tr("clients.action.edit", "Editar"), systemImage: "pencil")
                        }
                        // Fix 13: navy accent instead of blue — differentiates edit from destructive red
                        .tint(SolennixColors.accent)
                    }
                    .swipeActions(edge: .leading, allowsFullSwipe: true) {
                        if let email = client.email, !email.isEmpty,
                           let url = URL(string: "mailto:\(email)") {
                            Button {
                                HapticsHelper.play(.success)
                                openURL(url)
                            } label: {
                                Label(tr("clients.form.email", "Email"), systemImage: "envelope.fill")
                            }
                            .tint(SolennixColors.primary)
                        }

                        if !client.phone.isEmpty,
                           let url = URL(string: "tel:\(client.phone)") {
                            Button {
                                HapticsHelper.play(.success)
                                openURL(url)
                            } label: {
                                Label(tr("clients.action.call", "Llamar"), systemImage: "phone.fill")
                            }
                            .tint(.green)
                        }
                    }
                    .contextMenu {
                        NavigationLink(value: Route.clientForm(id: client.id)) {
                            Label(tr("clients.action.edit", "Editar"), systemImage: "pencil")
                        }
                        if !client.phone.isEmpty {
                            Button {
                                if let url = URL(string: "tel:\(client.phone)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(tr("clients.action.call", "Llamar"), systemImage: "phone")
                            }
                        }
                        if let email = client.email, !email.isEmpty {
                            Button {
                                if let url = URL(string: "mailto:\(email)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label(tr("clients.form.email", "Email"), systemImage: "envelope")
                            }
                        }
                        Divider()
                        Button(role: .destructive) {
                            viewModel.deleteTarget = client
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(tr("clients.delete.confirm", "Eliminar"), systemImage: "trash")
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
            .solennixListStyle()
            .popoverTip(swipeActionTip)
        }
    }

    /// Skeleton placeholder rows shown while clients are loading for the first time.
    /// Matches insetGrouped surface: listRowBackground card, no shadows, default insets.
    @ViewBuilder
    private var skeletonRows: some View {
        ForEach(0..<5, id: \.self) { _ in
            ClientSkeletonCard()
                .solennixRow()
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    // MARK: - Client Row

    /// Card-vocabulary row: Avatar + name (line 1) / pin+city (line 2) / phone (line 3)
    /// with a trailing anchor showing totalSpent (gold) + totalEvents (caption).
    /// Email is intentionally removed from the row — it lives in the detail screen.
    @ViewBuilder
    private func clientRow(_ client: Client) -> some View {
        let hasSpend = (client.totalSpent ?? 0) > 0
        let hasEvents = (client.totalEvents ?? 0) > 0
        let showAnchor = hasSpend || hasEvents

        let textColumn = Group {
            // Line 1: name
            Text(client.name)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(2)

            // Line 2: pin + city
            if let city = client.city, !city.isEmpty {
                Label(city, systemImage: "mappin")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
            }

            // Line 3: phone only (email intentionally omitted — lives in detail)
            if !client.phone.isEmpty {
                Text(client.phone)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
            }
        }

        let anchorColumn = VStack(alignment: .trailing, spacing: Spacing.xxs) {
            if hasSpend {
                Text(formattedAmount(client.totalSpent ?? 0))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.primary)
            }
            if hasEvents {
                Text(FeatureL10n.plural("clients.list.events_count", "%lld eventos", count: client.totalEvents ?? 0))
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
            }
        }

        if dynamicTypeSize >= .accessibility1 {
            // Large accessibility sizes: stack spend anchor below text column
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(alignment: .top, spacing: Spacing.md) {
                    Avatar(name: client.name, photoURL: client.photoUrl, size: 40)
                    VStack(alignment: .leading, spacing: Spacing.xs) { textColumn }
                }
                if showAnchor {
                    HStack { Spacer(); anchorColumn }
                }
            }
        } else {
            // Standard layout: trailing anchor aligned top-right
            HStack(alignment: .top, spacing: Spacing.md) {
                Avatar(name: client.name, photoURL: client.photoUrl, size: 40)
                VStack(alignment: .leading, spacing: Spacing.xs) { textColumn }
                if showAnchor {
                    Spacer(minLength: Spacing.sm)
                    anchorColumn
                } else {
                    Spacer()
                }
            }
        }
    }

    // MARK: - Accessibility

    /// Composed ordered label: name, city, N eventos, $X total, phone.
    /// Phone is appended last so VoiceOver speaks it as one continuous chunk
    /// rather than as an isolated element (which would cause digit-by-digit reading).
    private func clientAccessibilityLabel(_ client: Client) -> String {
        var parts: [String] = [client.name]
        if let city = client.city, !city.isEmpty {
            parts.append(city)
        }
        if let events = client.totalEvents, events > 0 {
            parts.append(FeatureL10n.plural("clients.list.events_count", "%lld eventos", count: events))
        }
        if let spent = client.totalSpent, spent > 0 {
            parts.append(formattedAmount(spent))
        }
        // Phone last — spoken as part of one label so VoiceOver doesn't
        // read individual digits as separate accessibility elements.
        if !client.phone.isEmpty {
            parts.append(client.phone)
        }
        return parts.joined(separator: ", ")
    }

    private func formattedAmount(_ value: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = FeatureL10n.locale
        f.maximumFractionDigits = 0
        f.minimumFractionDigits = 0
        return f.string(from: NSNumber(value: value)) ?? "$0"
    }

    // MARK: - Sort Menu

    private var sortMenu: some View {
        Menu {
            Picker(tr("clients.sort.title", "Ordenar por"), selection: $viewModel.sortKey) {
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
                        ? tr("clients.sort.ascending", "Ascendente")
                        : tr("clients.sort.descending", "Descendente"),
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .accessibilityLabel(tr("clients.sort.accessibility", "Ordenar clientes"))
        }
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private func trf(_ key: String, _ value: String, _ arg: CVarArg) -> String {
        FeatureL10n.format(key, value, arg)
    }

}

// MARK: - Client Skeleton Card

/// Skeleton placeholder matching the new clientRow card shape:
/// avatar circle + name bar + 2 caption bars + trailing money bar.
struct ClientSkeletonCard: View {
    public init() {}

    public var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            // Avatar stub
            Circle()
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 40, height: 40)

            // Text column stubs
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonLine(width: 160, height: 14) // name — subheadline
                SkeletonLine(width: 110, height: 12) // city — caption
                SkeletonLine(width: 90,  height: 12) // phone — caption
            }

            Spacer(minLength: Spacing.sm)

            // Trailing money stub
            VStack(alignment: .trailing, spacing: Spacing.xxs) {
                SkeletonLine(width: 64, height: 14) // totalSpent — subheadline.bold
                SkeletonLine(width: 48, height: 10) // totalEvents — caption2
            }
        }
    }
}

// MARK: - Preview

#Preview("Client List") {
    NavigationStack {
        ClientListView(apiClient: APIClient())
    }
}
