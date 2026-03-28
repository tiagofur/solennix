import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event List View

/// Standalone event list screen with search, status filters, and CSV export.
public struct EventListView: View {

    // MARK: - Properties

    @Environment(\.horizontalSizeClass) private var sizeClass
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
            searchBar
            filterChips
            resultCount
            eventList
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Eventos")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadEvents()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    exportCsv()
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = csvFileURL {
                ShareSheet(items: [url])
            }
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
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(SolennixColors.textTertiary)

            TextField("Buscar por cliente, servicio o lugar...", text: $viewModel.searchQuery)
                .textFieldStyle(.plain)
                .font(.body)

            if !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
        }
        .padding(Spacing.sm)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.sm)
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

        if filtered.isEmpty && !viewModel.isLoading {
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

            if viewModel.selectedStatus != nil || !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.selectedStatus = nil
                    viewModel.searchQuery = ""
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
