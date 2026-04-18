import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff List View

public struct StaffListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: StaffListViewModel
    @Environment(\.openURL) private var openURL
    @Environment(\.apiClient) private var apiClient
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: StaffListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle("Personal")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchText, prompt: "Buscar personal")
            .refreshable { await viewModel.loadStaff() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    NavigationLink(value: Route.staffForm()) {
                        Image(systemName: "plus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel("Agregar personal")
                    }

                    sortMenu
                }
            }
        }
        .confirmationDialog(
            "Eliminar personal",
            isPresented: $viewModel.showDeleteConfirm,
            presenting: viewModel.deleteTarget
        ) { item in
            Button("Eliminar", role: .destructive) {
                HapticsHelper.play(.success)
                guard let removed = viewModel.softDeleteStaff(item) else { return }
                toastManager.showUndo(
                    message: "\(item.name) eliminado",
                    onUndo: {
                        viewModel.restoreStaff(removed.staff, at: removed.index)
                        HapticsHelper.play(.success)
                    },
                    onExpire: {
                        Task { await viewModel.confirmDeleteStaff(removed.staff) }
                    }
                )
            }
            Button("Cancelar", role: .cancel) {}
        } message: { item in
            Text("Se eliminara a \(item.name). Podras deshacer durante unos segundos.")
        }
        .task {
            await viewModel.loadStaff()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let error = viewModel.errorMessage, viewModel.staff.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: "Error al cargar",
                message: error,
                actionTitle: "Reintentar"
            ) {
                Task { await viewModel.loadStaff() }
            }
        } else if viewModel.isLoading && viewModel.staff.isEmpty {
            skeletonList
        } else if viewModel.filteredStaff.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty {
                EmptyStateView(
                    icon: "person.3",
                    title: "Sin personal",
                    message: "Agrega a tu primer colaborador para asignarlo a eventos",
                    actionTitle: "Agregar Personal"
                ) {
                    // FAB handles navigation; empty state CTA is visual only
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: "Sin resultados",
                    message: "No se encontro personal que coincida con tu busqueda"
                )
            }
        } else {
            staffList
        }
    }

    // MARK: - Staff List

    @ViewBuilder
    private var staffList: some View {
        if sizeClass == .regular {
            staffGrid
        } else {
            staffListCompact
        }
    }

    private var staffGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.sm) {
                ForEach(viewModel.paginatedStaff) { item in
                    NavigationLink(value: Route.staffDetail(id: item.id)) {
                        staffRow(item)
                            .padding(Spacing.md)
                            .background(SolennixColors.card)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                            .shadowSm()
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        NavigationLink(value: Route.staffForm(id: item.id)) {
                            Label("Editar", systemImage: "pencil")
                        }
                        if let phone = item.phone, !phone.isEmpty {
                            Button {
                                if let url = URL(string: "tel:\(phone)") {
                                    openURL(url)
                                }
                                HapticsHelper.play(.success)
                            } label: {
                                Label("Llamar", systemImage: "phone")
                            }
                        }
                        if let email = item.email, !email.isEmpty {
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
                            viewModel.deleteTarget = item
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label("Eliminar", systemImage: "trash")
                        }
                    }
                    .task {
                        if item == viewModel.paginatedStaff.last {
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

    private var staffListCompact: some View {
        List {
            ForEach(viewModel.paginatedStaff) { item in
                NavigationLink(value: Route.staffDetail(id: item.id)) {
                    staffRow(item)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    Button(role: .destructive) {
                        HapticsHelper.play(.warning)
                        viewModel.deleteTarget = item
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label("Eliminar", systemImage: "trash")
                    }

                    NavigationLink(value: Route.staffForm(id: item.id)) {
                        Label("Editar", systemImage: "pencil")
                    }
                    .tint(.blue)
                }
                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                    if let email = item.email, !email.isEmpty,
                       let url = URL(string: "mailto:\(email)") {
                        Button {
                            HapticsHelper.play(.success)
                            openURL(url)
                        } label: {
                            Label("Email", systemImage: "envelope.fill")
                        }
                        .tint(.blue)
                    }

                    if let phone = item.phone, !phone.isEmpty,
                       let url = URL(string: "tel:\(phone)") {
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
                    NavigationLink(value: Route.staffForm(id: item.id)) {
                        Label("Editar", systemImage: "pencil")
                    }
                    if let phone = item.phone, !phone.isEmpty {
                        Button {
                            if let url = URL(string: "tel:\(phone)") {
                                openURL(url)
                            }
                            HapticsHelper.play(.success)
                        } label: {
                            Label("Llamar", systemImage: "phone")
                        }
                    }
                    if let email = item.email, !email.isEmpty {
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
                        viewModel.deleteTarget = item
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label("Eliminar", systemImage: "trash")
                    }
                }
                .task {
                    if item == viewModel.paginatedStaff.last {
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

    // MARK: - Staff Row

    private func staffRow(_ item: Staff) -> some View {
        HStack(spacing: Spacing.md) {
            Avatar(name: item.name, photoURL: nil, size: 40)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(item.name)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let role = item.roleLabel, !role.isEmpty {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "briefcase")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                        Text(role)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                HStack(spacing: Spacing.sm) {
                    if let phone = item.phone, !phone.isEmpty {
                        Text(phone)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    if let email = item.email, !email.isEmpty {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()

            if item.notificationEmailOptIn {
                Image(systemName: "bell.badge")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                    .accessibilityLabel("Avisos por email activados")
            }
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
                ForEach(StaffSortKey.allCases, id: \.self) { key in
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
                .accessibilityLabel("Ordenar personal")
        }
    }
}

// MARK: - Preview

#Preview("Staff List") {
    NavigationStack {
        StaffListView(apiClient: APIClient())
    }
}
