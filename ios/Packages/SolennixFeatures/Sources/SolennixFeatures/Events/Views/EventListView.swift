import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event List View

/// Standalone event list screen with search, status filters, and CSV export.
public struct EventListView: View {

    // MARK: - Properties

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(CacheManager.self) private var cacheManager: CacheManager?
    @Environment(ToastManager.self) private var toastManager
    @State private var viewModel: EventListViewModel
    @State private var showShareSheet = false
    @State private var csvFileURL: URL?

    // MARK: - Init

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: EventListViewModel(apiClient: apiClient))
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            if viewModel.isShowingCachedData {
                CachedDataBanner()
            }
            searchBar
            filterChips
            advancedFilters
            resultCount
            eventList
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Eventos")
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            viewModel.setCacheManager(cacheManager)
            await viewModel.loadEvents()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    Menu {
                        NavigationLink(value: Route.eventForm()) {
                            Label("Nuevo Evento", systemImage: "calendar.badge.plus")
                        }

                        NavigationLink(value: Route.quickQuote) {
                            Label("Cotización Rápida", systemImage: "doc.text.magnifyingglass")
                        }
                    } label: {
                        Image(systemName: "plus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel("Crear evento o cotización")
                    }

                    Button {
                        exportCsv()
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel("Exportar eventos a CSV")
                    }
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = csvFileURL {
                ShareSheet(items: [url])
            }
        }
        .confirmationDialog(
            "Eliminar evento",
            isPresented: $viewModel.showDeleteConfirm,
            presenting: viewModel.deleteTarget
        ) { event in
            Button("Eliminar", role: .destructive) {
                HapticsHelper.play(.success)
                guard let removed = viewModel.softDeleteEvent(event) else { return }
                toastManager.showUndo(
                    message: "\(event.serviceType) eliminado",
                    onUndo: {
                        viewModel.restoreEvent(removed.event, at: removed.index)
                        HapticsHelper.play(.success)
                    },
                    onExpire: {
                        Task { await viewModel.confirmDeleteEvent(removed.event) }
                    }
                )
            }
            Button("Cancelar", role: .cancel) {}
        } message: { event in
            Text("Se eliminara \"\(event.serviceType)\". Podras deshacer durante unos segundos.")
        }
        .overlay {
            if viewModel.isLoading && viewModel.events.isEmpty {
                ProgressView()
                    .controlSize(.large)
                    .tint(SolennixColors.primary)
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        InlineFilterBar(
            placeholder: "Filtrar por cliente, servicio o lugar...",
            text: $viewModel.searchQuery
        )
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                ForEach(viewModel.statusFilters, id: \.label) { filter in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.selectedStatus = filter.status
                        }
                    } label: {
                        HStack(spacing: Spacing.xs) {
                            Text(filter.label)
                                .font(.caption)
                                .fontWeight(.semibold)

                            Text("\(filter.count)")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    viewModel.selectedStatus == filter.status
                                        ? Color.white.opacity(0.3)
                                        : SolennixColors.textTertiary.opacity(0.2)
                                )
                                .clipShape(Capsule())
                        }
                        .foregroundStyle(
                            viewModel.selectedStatus == filter.status
                                ? .white
                                : SolennixColors.textSecondary
                        )
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            viewModel.selectedStatus == filter.status
                                ? SolennixColors.primary
                                : SolennixColors.surfaceAlt
                        )
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.full))
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
        }
        .padding(.top, Spacing.sm)
    }

    // MARK: - Advanced Filters

    @ViewBuilder
    private var advancedFilters: some View {
        VStack(spacing: 0) {
            // Toggle row
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    viewModel.showAdvancedFilters.toggle()
                }
            } label: {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .font(.subheadline)
                    Text("Filtros")
                        .font(.caption)
                        .fontWeight(.medium)

                    if viewModel.activeFilterCount > 0 {
                        Text("\(viewModel.activeFilterCount)")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SolennixColors.primary)
                            .clipShape(Capsule())
                    }

                    Spacer()

                    if viewModel.activeFilterCount > 0 {
                        Button {
                            viewModel.clearAdvancedFilters()
                        } label: {
                            Text("Limpiar")
                                .font(.caption)
                                .foregroundStyle(SolennixColors.error)
                        }
                    }

                    Image(systemName: viewModel.showAdvancedFilters ? "chevron.up" : "chevron.down")
                        .font(.caption)
                }
                .foregroundStyle(SolennixColors.textSecondary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
            }

            // Expandable filter content
            if viewModel.showAdvancedFilters {
                VStack(spacing: Spacing.sm) {
                    // Client picker
                    HStack {
                        Text("Cliente")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.textSecondary)
                            .frame(width: 60, alignment: .leading)

                        Picker("Cliente", selection: $viewModel.selectedClientId) {
                            Text("Todos").tag(String?.none)
                            ForEach(viewModel.clients.sorted(by: { $0.name < $1.name })) { client in
                                Text(client.name).tag(Optional(client.id))
                            }
                        }
                        .pickerStyle(.menu)
                        .tint(SolennixColors.primary)
                    }

                    // Date range
                    HStack {
                        Text("Desde")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.textSecondary)
                            .frame(width: 60, alignment: .leading)

                        if let start = viewModel.dateRangeStart {
                            DatePicker("", selection: Binding(
                                get: { start },
                                set: { viewModel.dateRangeStart = $0 }
                            ), displayedComponents: .date)
                            .labelsHidden()
                            .tint(SolennixColors.primary)

                            Button {
                                viewModel.dateRangeStart = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textTertiary)
                            }
                        } else {
                            Button {
                                viewModel.dateRangeStart = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
                            } label: {
                                Text("Seleccionar")
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.primary)
                            }
                        }

                        Spacer()
                    }

                    HStack {
                        Text("Hasta")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.textSecondary)
                            .frame(width: 60, alignment: .leading)

                        if let end = viewModel.dateRangeEnd {
                            DatePicker("", selection: Binding(
                                get: { end },
                                set: { viewModel.dateRangeEnd = $0 }
                            ), displayedComponents: .date)
                            .labelsHidden()
                            .tint(SolennixColors.primary)

                            Button {
                                viewModel.dateRangeEnd = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textTertiary)
                            }
                        } else {
                            Button {
                                viewModel.dateRangeEnd = Date()
                            } label: {
                                Text("Seleccionar")
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.primary)
                            }
                        }

                        Spacer()
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.sm)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Result Count

    private var resultCount: some View {
        HStack {
            Text("\(viewModel.filteredEvents.count) eventos")
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            Spacer()
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.sm)
        .padding(.bottom, Spacing.xs)
    }

    // MARK: - Event List

    @ViewBuilder
    private var eventList: some View {
        let filtered = viewModel.filteredEvents

        if let error = viewModel.errorMessage, filtered.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: "Error al cargar",
                message: error,
                actionTitle: "Reintentar"
            ) {
                Task { await viewModel.loadEvents() }
            }
            .frame(maxHeight: .infinity)
        } else if filtered.isEmpty && !viewModel.isLoading {
            emptyState
        } else {
            ScrollView {
                if sizeClass == .regular {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.sm) {
                        ForEach(filtered) { event in
                            NavigationLink(value: Route.eventDetail(id: event.id)) {
                                eventCard(event)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                NavigationLink(value: Route.eventForm(id: event.id)) {
                                    Label("Editar", systemImage: "pencil")
                                }
                                NavigationLink(value: Route.eventChecklist(id: event.id)) {
                                    Label("Checklist", systemImage: "checklist")
                                }
                                Divider()
                                Button(role: .destructive) {
                                    HapticsHelper.play(.warning)
                                    viewModel.deleteTarget = event
                                    viewModel.showDeleteConfirm = true
                                } label: {
                                    Label("Eliminar", systemImage: "trash")
                                }
                            }
                        }
                    }
                } else {
                    LazyVStack(spacing: Spacing.sm) {
                        ForEach(filtered) { event in
                            NavigationLink(value: Route.eventDetail(id: event.id)) {
                                eventCard(event)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                NavigationLink(value: Route.eventForm(id: event.id)) {
                                    Label("Editar", systemImage: "pencil")
                                }
                                NavigationLink(value: Route.eventChecklist(id: event.id)) {
                                    Label("Checklist", systemImage: "checklist")
                                }
                                Divider()
                                Button(role: .destructive) {
                                    HapticsHelper.play(.warning)
                                    viewModel.deleteTarget = event
                                    viewModel.showDeleteConfirm = true
                                } label: {
                                    Label("Eliminar", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.xxl)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(SolennixColors.textTertiary)

            Text("No se encontraron eventos")
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            if viewModel.selectedStatus != nil || !viewModel.searchQuery.isEmpty || viewModel.activeFilterCount > 0 {
                Button {
                    viewModel.selectedStatus = nil
                    viewModel.searchQuery = ""
                    viewModel.clearAdvancedFilters()
                } label: {
                    Text("Limpiar filtros")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, Spacing.xxxl)
    }

    // MARK: - Event Card

    private func eventCard(_ event: Event) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Title row: service type + status badge
            HStack {
                Text(event.serviceType)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)

                Spacer()

                StatusBadge(status: event.status.rawValue)
            }

            // Date
            Text(formattedEventDate(event.eventDate))
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)

            // Client name
            Label(viewModel.clientName(for: event.clientId), systemImage: "person")
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)

            // Location (if available)
            if let location = event.location, !location.isEmpty {
                let displayLocation = [location, event.city]
                    .compactMap { $0 }
                    .filter { !$0.isEmpty }
                    .joined(separator: ", ")
                Label(displayLocation, systemImage: "mappin")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
            }

            Divider()

            // Bottom row: people count + total amount
            HStack {
                Label("\(event.numPeople) personas", systemImage: "person.2")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                Text(event.totalAmount.asMXN)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.primary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Helpers

    private static let displayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.dateFormat = "EEEE d 'de' MMMM, yyyy"
        return f
    }()

    private static let apiDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let apiDateTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        return f
    }()

    private func formattedEventDate(_ dateStr: String) -> String {
        // Try date-only format first, then ISO datetime
        if let date = Self.apiDateFormatter.date(from: dateStr) {
            return Self.displayDateFormatter.string(from: date).capitalized
        }
        if let date = Self.apiDateTimeFormatter.date(from: dateStr) {
            return Self.displayDateFormatter.string(from: date).capitalized
        }
        return dateStr
    }

    private func exportCsv() {
        let content = viewModel.generateCsvContent()
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("eventos_solennix.csv")
        do {
            try content.write(to: fileURL, atomically: true, encoding: .utf8)
            csvFileURL = fileURL
            showShareSheet = true
        } catch {
            // Silently fail — CSV export is not critical
        }
    }
}

// MARK: - Share Sheet

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Preview

#Preview("Event List") {
    NavigationStack {
        EventListView(apiClient: APIClient())
    }
}
