import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork
import TipKit

// MARK: - Event List View

/// Standalone event list screen with search, status filters, and CSV export.
public struct EventListView: View {

    // MARK: - Properties

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.apiClient) private var apiClient
    @Environment(CacheManager.self) private var cacheManager: CacheManager?
    @Environment(ToastManager.self) private var toastManager
    @State private var viewModel: EventListViewModel
    @State private var showShareSheet = false
    @State private var csvFileURL: URL?
    @State private var showQuickQuote = false
    @State private var showDateFilter = false

    // TipKit tips
    private let newEventTip = NewEventTip()
    private let quickQuoteTip = QuickQuoteTip()

    @ScaledMetric(relativeTo: .largeTitle) private var emptyIconSize: CGFloat = 40

    // MARK: - Init

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: EventListViewModel(apiClient: apiClient))
    }

    // MARK: - Body

    public var body: some View {
        eventList
            .background(SolennixColors.surfaceGrouped)
            .softScrollEdgeEffectIfAvailable()
            // Haptic feedback when the destructive delete confirmation appears (true only).
            .sensoryFeedback(.warning, trigger: viewModel.showDeleteConfirm) { _, newValue in newValue }
            .navigationTitle(tr("events.list.title", "Eventos"))
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchQuery, prompt: tr("events.list.search_placeholder", "Buscar eventos..."))
            .safeAreaInset(edge: .top, spacing: 0) {
                // Only static banners live in safeAreaInset. Nested horizontal
                // ScrollViews (filter chips) must stay inside the primary
                // ScrollView so they don't steal scroll-edge tracking from
                // the large title.
                if viewModel.isShowingCachedData {
                    CachedDataBanner()
                        .background(SolennixColors.surfaceGrouped)
                }
            }
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
                    // Date filter
                    Button {
                        showDateFilter = true
                    } label: {
                        Image(systemName: viewModel.activeFilterCount > 0 ? "calendar.badge.clock" : "calendar")
                            .font(.body)
                            .foregroundStyle(viewModel.activeFilterCount > 0 ? SolennixColors.primary : SolennixColors.primary)
                            .symbolEffect(.bounce, value: viewModel.activeFilterCount)
                            .accessibilityLabel(tr("events.list.filters.title", "Filtrar por fecha"))
                    }

                    // Add + overflow menu (sort + export consolidated per WU5)
                    Menu {
                        NavigationLink(value: Route.eventForm()) {
                            Label(tr("events.list.new_event", "Nuevo evento"), systemImage: "calendar.badge.plus")
                        }

                        Button {
                            showQuickQuote = true
                            quickQuoteTip.invalidate(reason: .actionPerformed)
                        } label: {
                            Label(tr("events.list.quick_quote", "Cotización rápida"), systemImage: "doc.text.magnifyingglass")
                        }
                    } label: {
                        Image(systemName: "plus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel(tr("events.list.create_event_or_quote", "Crear evento o cotización"))
                            .popoverTip(newEventTip)
                            .popoverTip(quickQuoteTip)
                    }

                    // Overflow: sort options + CSV export
                    Menu {
                        Section {
                            sortMenuButton(field: .eventDate,    label: tr("events.list.sort.date",    "Fecha"))
                            sortMenuButton(field: .serviceType,  label: tr("events.list.sort.service", "Servicio"))
                            sortMenuButton(field: .clientName,   label: tr("events.list.sort.client",  "Cliente"))
                            sortMenuButton(field: .totalAmount,  label: tr("events.list.sort.total",   "Total"))
                        }
                        Divider()
                        Button {
                            exportCsv()
                        } label: {
                            Label(tr("events.list.export_csv_aria", "Exportar eventos a CSV"), systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .symbolEffect(.bounce, value: viewModel.sortField)
                            .accessibilityLabel(tr("events.list.toolbar.more_actions", "Más acciones"))
                    }
                }
            }
        }
            .sheet(isPresented: $showShareSheet) {
                if let url = csvFileURL {
                    ShareSheet(items: [url])
                }
            }
            .sheet(isPresented: $showQuickQuote) {
                QuickQuoteView(apiClient: apiClient)
            }
            .sheet(isPresented: $showDateFilter) {
                DateFilterSheet(
                    startDate: $viewModel.dateRangeStart,
                    endDate: $viewModel.dateRangeEnd,
                    onClear: { viewModel.clearAdvancedFilters() }
                )
                .presentationDetents([.height(380)])
                .presentationDragIndicator(.visible)
            }
            .confirmationDialog(
                tr("events.list.delete_confirm.title", "Eliminar evento"),
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { event in
                Button(tr("events.list.actions.delete", "Eliminar"), role: .destructive) {
                    HapticsHelper.play(.success)
                    guard let removed = viewModel.softDeleteEvent(event) else { return }
                    toastManager.showUndo(
                        message: String(
                            format: tr("events.list.delete_confirm.undo_message", "%@ eliminado"),
                            locale: FeatureL10n.locale,
                            event.serviceType
                        ),
                        onUndo: {
                            viewModel.restoreEvent(removed.event, at: removed.index)
                            HapticsHelper.play(.success)
                        },
                        onExpire: {
                            Task { await viewModel.confirmDeleteEvent(removed.event) }
                        }
                    )
                }
                Button(tr("events.list.delete_confirm.cancel", "Cancelar"), role: .cancel) {}
            } message: { event in
                Text(
                    String(
                        format: tr("events.list.delete_confirm.description_named", "Se eliminará \"%@\". Podrás deshacer durante unos segundos."),
                        locale: FeatureL10n.locale,
                        event.serviceType
                    )
                )
            }
            .overlay {
                // Non-empty refresh spinner (existing items visible behind)
                if viewModel.isLoading && !viewModel.events.isEmpty {
                    ProgressView()
                        .controlSize(.large)
                        .tint(SolennixColors.primary)
                }
            }
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                ForEach(viewModel.statusFilters, id: \.label) { filter in
                    let isSelected = viewModel.selectedStatus == filter.status
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
                                    isSelected
                                        ? Color.white.opacity(0.3)
                                        : SolennixColors.textTertiary.opacity(0.2)
                                )
                                .clipShape(Capsule())
                        }
                        .foregroundStyle(
                            isSelected
                                ? .white
                                : SolennixColors.textSecondary
                        )
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                        .background(
                            isSelected
                                ? SolennixColors.primary
                                : SolennixColors.surfaceAlt
                        )
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.full))
                    }
                    .accessibilityLabel(
                        isSelected
                            ? String.localizedStringWithFormat(
                                tr("events.list.chip.selected_label", "%@, %lld events, selected"),
                                filter.label, filter.count)
                            : String.localizedStringWithFormat(
                                tr("events.list.chip.label", "%@, %lld events"),
                                filter.label, filter.count)
                    )
                    .accessibilityAddTraits(isSelected ? [.isSelected] : [])
                }
            }
            .padding(.horizontal, Spacing.md)
        }
        .padding(.top, Spacing.sm)
    }

    // MARK: - Date Filter Sheet

    private struct DateFilterSheet: View {
        @Binding var startDate: Date?
        @Binding var endDate: Date?
        var onClear: () -> Void
        @Environment(\.dismiss) private var dismiss

        private func tr(_ key: String, _ value: String) -> String {
            FeatureL10n.text(key, value)
        }

        // DatePicker requires non-optional Binding — use sentinel Date()
        private var startBinding: Binding<Date> {
            Binding(get: { startDate ?? Date() }, set: { startDate = $0 })
        }
        private var endBinding: Binding<Date> {
            Binding(get: { endDate ?? Date() }, set: { endDate = $0 })
        }

        var body: some View {
            NavigationStack {
                Form {
                    Section {
                        Toggle(isOn: Binding(
                            get: { startDate != nil },
                            set: { if !$0 { startDate = nil } else { startDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date() } }
                        )) {
                            Text(tr("events.list.filters.from", "Desde"))
                                .font(.body)
                        }
                        .tint(SolennixColors.primary)

                        if startDate != nil {
                            DatePicker("", selection: startBinding, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .tint(SolennixColors.primary)
                        }
                    }

                    Section {
                        Toggle(isOn: Binding(
                            get: { endDate != nil },
                            set: { if !$0 { endDate = nil } else { endDate = Date() } }
                        )) {
                            Text(tr("events.list.filters.to", "Hasta"))
                                .font(.body)
                        }
                        .tint(SolennixColors.primary)

                        if endDate != nil {
                            DatePicker("", selection: endBinding, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .tint(SolennixColors.primary)
                        }
                    }
                }
                .navigationTitle(tr("events.list.filters.title", "Filtrar por fecha"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(tr("events.list.filters.clear", "Limpiar")) {
                            onClear()
                        }
                        .foregroundStyle(SolennixColors.error)
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(tr("events.list.filters.apply", "Aplicar")) {
                            dismiss()
                        }
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.primary)
                    }
                }
            }
        }
    }

    // MARK: - Result Count

    private var resultCount: some View {
        HStack {
            Text(
                String.localizedStringWithFormat(
                    tr("events.list.result_count", "%lld events"),
                    viewModel.filteredEvents.count
                )
            )
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
        if sizeClass == .regular {
            // iPad: keep the ScrollView+LazyVGrid layout unchanged.
            // The ScrollView root ensures large title tracking and the
            // grid provides multi-column density.
            ScrollView {
                filterChips
                resultCount
                eventListContent
            }
        } else {
            // iPhone: native List for pull-to-refresh, swipe actions,
            // and correct keyboard avoidance. Filter chips and result count
            // are the first row so they scroll with the content (same
            // behavior as the previous ScrollView layout).
            iPhoneEventList
        }
    }

    /// iPhone-only event list built on native `List` so swipe actions work.
    @ViewBuilder
    private var iPhoneEventList: some View {
        let filtered = viewModel.filteredEvents

        List {
            // Filters + result count scroll inline with the list rows.
            Section {
                VStack(spacing: 0) {
                    filterChips
                    resultCount
                }
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
            }

            if viewModel.isLoading && viewModel.events.isEmpty {
                // Skeleton loading state
                skeletonCards
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
            } else if let error = viewModel.errorMessage, filtered.isEmpty, !viewModel.isLoading {
                EmptyStateView(
                    icon: "wifi.exclamationmark",
                    title: tr("events.list.error.load_title", "Error al cargar"),
                    message: error,
                    actionTitle: tr("events.list.error.retry", "Reintentar")
                ) {
                    Task { await viewModel.loadEvents() }
                }
                .padding(.top, Spacing.xl)
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
            } else if filtered.isEmpty && !viewModel.isLoading {
                emptyState
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
            } else {
                ForEach(filtered) { event in
                    // The visible NavigationLink renders a trailing disclosure
                    // chevron inside a List and steals trailing space. Instead
                    // we layer an opacity-0 link over the fully tappable card so
                    // navigation works without the chevron. The card itself
                    // carries the accessible label/value, so the hidden link is
                    // marked .accessibilityHidden to avoid a duplicate element.
                    eventCard(event)
                        .overlay {
                            NavigationLink(value: Route.eventDetail(id: event.id)) {
                                EmptyView()
                            }
                            .opacity(0)
                            .accessibilityHidden(true)
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(cardAccessibilityLabel(event))
                        .accessibilityAddTraits(.isButton)
                        // Edit and Checklist are exposed through the context-menu rotor automatically.
                        // Only the delete action needs an explicit wired entry here.
                        .accessibilityAction(named: tr("events.list.actions.delete", "Eliminar")) {
                            viewModel.deleteTarget = event
                            viewModel.showDeleteConfirm = true
                        }
                        .listRowInsets(EdgeInsets(top: Spacing.xs, leading: Spacing.md, bottom: Spacing.xs, trailing: Spacing.md))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .contextMenu {
                            NavigationLink(value: Route.eventForm(id: event.id)) {
                                Label(tr("events.list.actions.edit", "Editar"), systemImage: "pencil")
                            }
                            NavigationLink(value: Route.eventChecklist(id: event.id)) {
                                Label(tr("events.list.actions.checklist", "Checklist"), systemImage: "checklist")
                            }
                            Menu {
                                statusChangeButton(event: event, status: .quoted,    label: tr("events.list.status.quoted", "Cotizado"))
                                statusChangeButton(event: event, status: .confirmed, label: tr("events.list.status.confirmed", "Confirmado"))
                                statusChangeButton(event: event, status: .completed, label: tr("events.list.status.completed", "Completado"))
                                statusChangeButton(event: event, status: .cancelled, label: tr("events.list.status.cancelled", "Cancelado"))
                            } label: {
                                Label(tr("events.list.actions.change_status", "Cambiar estado"), systemImage: "arrow.triangle.2.circlepath")
                            }
                            Divider()
                            Button(role: .destructive) {
                                viewModel.deleteTarget = event
                                viewModel.showDeleteConfirm = true
                            } label: {
                                Label(tr("events.list.actions.delete", "Eliminar"), systemImage: "trash")
                            }
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                viewModel.deleteTarget = event
                                viewModel.showDeleteConfirm = true
                            } label: {
                                Label(tr("events.list.actions.delete", "Eliminar"), systemImage: "trash")
                            }
                            NavigationLink(value: Route.eventForm(id: event.id)) {
                                Label(tr("events.list.actions.edit", "Editar"), systemImage: "pencil")
                            }
                            .tint(.blue)
                        }
                        .swipeActions(edge: .leading, allowsFullSwipe: false) {
                            NavigationLink(value: Route.eventChecklist(id: event.id)) {
                                Label(tr("events.list.actions.checklist", "Checklist"), systemImage: "checklist")
                            }
                            .tint(SolennixColors.primary)
                        }
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Skeleton Placeholder

    private var skeletonCards: some View {
        LazyVStack(spacing: Spacing.sm) {
            ForEach(0..<5, id: \.self) { _ in
                EventSkeletonCard()
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.lg)
        .accessibilityHidden(true)
    }

    /// iPad-only content used inside the ScrollView+LazyVGrid layout.
    /// The iPhone path uses `iPhoneEventList` (a native `List`) instead.
    @ViewBuilder
    private var eventListContent: some View {
        let filtered = viewModel.filteredEvents

        if viewModel.isLoading && viewModel.events.isEmpty {
            skeletonCards
        } else if let error = viewModel.errorMessage, filtered.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: tr("events.list.error.load_title", "Error al cargar"),
                message: error,
                actionTitle: tr("events.list.error.retry", "Reintentar")
            ) {
                Task { await viewModel.loadEvents() }
            }
            .padding(.top, Spacing.xl)
        } else if filtered.isEmpty && !viewModel.isLoading {
            emptyState
        } else {
            // iPad multi-column grid
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: Spacing.sm) {
                ForEach(filtered) { event in
                    NavigationLink(value: Route.eventDetail(id: event.id)) {
                        eventCard(event)
                    }
                    .buttonStyle(.plain)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(cardAccessibilityLabel(event))
                    .accessibilityAction(named: tr("events.list.actions.delete", "Eliminar")) {
                        viewModel.deleteTarget = event
                        viewModel.showDeleteConfirm = true
                    }
                    .contextMenu {
                        NavigationLink(value: Route.eventForm(id: event.id)) {
                            Label(tr("events.list.actions.edit", "Editar"), systemImage: "pencil")
                        }
                        NavigationLink(value: Route.eventChecklist(id: event.id)) {
                            Label(tr("events.list.actions.checklist", "Checklist"), systemImage: "checklist")
                        }
                        Menu {
                            statusChangeButton(event: event, status: .quoted,    label: tr("events.list.status.quoted", "Cotizado"))
                            statusChangeButton(event: event, status: .confirmed, label: tr("events.list.status.confirmed", "Confirmado"))
                            statusChangeButton(event: event, status: .completed, label: tr("events.list.status.completed", "Completado"))
                            statusChangeButton(event: event, status: .cancelled, label: tr("events.list.status.cancelled", "Cancelado"))
                        } label: {
                            Label(tr("events.list.actions.change_status", "Cambiar estado"), systemImage: "arrow.triangle.2.circlepath")
                        }
                        Divider()
                        Button(role: .destructive) {
                            viewModel.deleteTarget = event
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(tr("events.list.actions.delete", "Eliminar"), systemImage: "trash")
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.lg)
        }
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyState: some View {
        let hasActiveFilters = viewModel.selectedStatus != nil
            || !viewModel.searchQuery.isEmpty
            || viewModel.activeFilterCount > 0

        if hasActiveFilters {
            // Filtered/search empty — keep lean "no results" treatment
            VStack(spacing: Spacing.md) {
                Image(systemName: "doc.text.magnifyingglass")
                    .font(.system(size: emptyIconSize))
                    .foregroundStyle(SolennixColors.textTertiary)

                Text(tr("events.list.empty.no_results_title", "No se encontraron eventos"))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)

                Button {
                    viewModel.selectedStatus = nil
                    viewModel.searchQuery = ""
                    viewModel.clearAdvancedFilters()
                } label: {
                    Text(tr("events.list.filters.clear_all", "Limpiar filtros"))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.primary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.vertical, Spacing.xxxl)
        } else {
            // Truly empty — first-run teaching state.
            // EmptyStateView renders icon/title/message; the NavigationLink
            // below it drives the same Route.eventForm() push used by the
            // toolbar "+" menu, styled identically to PremiumButton.
            VStack(spacing: 0) {
                EmptyStateView(
                    icon: "calendar.badge.plus",
                    title: tr("events.list.empty.first_run_title", "Crea tu primer evento"),
                    message: tr("events.list.empty.first_run_message", "Registra tus eventos para llevar el control de fechas, clientes y pagos en un solo lugar.")
                )

                NavigationLink(value: Route.eventForm()) {
                    Text(tr("events.list.empty.first_run_cta", "Crear evento"))
                        .font(.headline)
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.vertical, 16)
                        .background(SolennixGradient.premium)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                        .shadowFab()
                }
                .padding(.bottom, Spacing.xxl)
            }
        }
    }

    // MARK: - Event Card

    /// Redesigned card with date-proximity anchor at top-left, status badge
    /// top-right, client name + service + metadata + money bottom-right.
    /// Layout adapts to accessibility type sizes via `dynamicTypeSize`.
    private func eventCard(_ event: Event) -> some View {
        let parsedDate = Self.parseEventDate(event.eventDate)
        let dateLabel = relativeDateLabel(for: event, parsed: parsedDate)
        let isUrgent = isEventUrgent(event, parsed: parsedDate)

        return VStack(alignment: .leading, spacing: Spacing.xs) {
            // Row 1: date lockup (top-left) + status badge (top-right)
            if dynamicTypeSize >= .accessibility1 {
                // Stacked layout for large accessibility sizes
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(dateLabel)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundStyle(isUrgent ? SolennixColors.warning : SolennixColors.text)

                    if viewModel.updatingStatusEventId == event.id {
                        ProgressView()
                            .controlSize(.mini)
                            .tint(SolennixColors.primary)
                    } else {
                        StatusBadge(status: event.status.rawValue)
                    }
                }
            } else {
                HStack(alignment: .top) {
                    Text(dateLabel)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundStyle(isUrgent ? SolennixColors.warning : SolennixColors.text)

                    Spacer(minLength: Spacing.sm)

                    if viewModel.updatingStatusEventId == event.id {
                        ProgressView()
                            .controlSize(.mini)
                            .tint(SolennixColors.primary)
                    } else {
                        StatusBadge(status: event.status.rawValue)
                    }
                }
            }

            // Row 2: client name
            Text(viewModel.clientName(for: event.clientId))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(2)

            // Row 3: service type
            Text(event.serviceType)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)

            // Row 4: location + people count in one metadata row
            metadataRow(event)

            // Inset separator — calmer than full-width Divider
            Rectangle()
                .fill(SolennixColors.separator)
                .frame(height: 0.5)
                .padding(.leading, Spacing.xs)

            // Row 5: total amount (bottom-right only gold usage on card)
            HStack {
                Spacer()
                Text(formattedAmount(event.totalAmount))
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

    /// One metadata row: location (if available) + people count, same `.caption` style.
    @ViewBuilder
    private func metadataRow(_ event: Event) -> some View {
        HStack(spacing: Spacing.sm) {
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

            Label(
                String.localizedStringWithFormat(
                    tr("events.list.people_count", "%lld people"),
                    event.numPeople
                ),
                systemImage: "person.2"
            )
            .font(.caption)
            .foregroundStyle(SolennixColors.textSecondary)
        }
    }

    // MARK: - Accessibility Label

    private func cardAccessibilityLabel(_ event: Event) -> String {
        let parsedDate = Self.parseEventDate(event.eventDate)
        // relativeDateLabel uses "·" as a visual separator (VoiceOver reads it as "dot").
        // Replace with ", " so the spoken phrase flows naturally.
        let datePhrase = relativeDateLabel(for: event, parsed: parsedDate)
            .replacingOccurrences(of: " · ", with: ", ")
        let status = localizedStatus(event.status)
        let client = viewModel.clientName(for: event.clientId)
        let service = event.serviceType
        let total = formattedAmount(event.totalAmount)
        return "\(datePhrase). \(status). \(client). \(service). \(total)."
    }

    private func localizedStatus(_ status: EventStatus) -> String {
        switch status {
        case .quoted:    return tr("events.list.status.quoted",    "Cotizado")
        case .confirmed: return tr("events.list.status.confirmed", "Confirmado")
        case .completed: return tr("events.list.status.completed", "Completado")
        case .cancelled: return tr("events.list.status.cancelled", "Cancelado")
        }
    }

    // MARK: - Sort Menu

    /// Helper that builds a Menu option with a checkmark on the active
    /// sort field and an ascending / descending arrow next to it.
    @ViewBuilder
    private func sortMenuButton(field: EventSortField, label: String) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.applySort(field)
            }
            HapticsHelper.play(.success)
        } label: {
            if viewModel.sortField == field {
                Label(
                    label,
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            } else {
                Text(label)
            }
        }
    }

    /// Inline status change button — checkmark on the event's current status.
    @ViewBuilder
    private func statusChangeButton(event: Event, status: EventStatus, label: String) -> some View {
        Button {
            Task { await viewModel.updateEventStatus(event, to: status) }
        } label: {
            if event.status == status {
                Label(label, systemImage: "checkmark")
            } else {
                Text(label)
            }
        }
    }

    // MARK: - Relative Date Logic

    /// Returns a human-readable date label with proximity context.
    /// - Within 7 days and future: "Hoy · 18:00", "Mañana · 18:00", "En 3 días · 15 mar"
    /// - Beyond 7 days or past: "15 mar 2026 · 18:00"
    /// - Past events: absolute date (textSecondary handled at call site via `isUrgent`)
    private func relativeDateLabel(for event: Event, parsed: Date?) -> String {
        guard let date = parsed else { return event.eventDate }

        let timeStr = formattedTimeComponent(event)
        // The parsed date is UTC midnight (apiDateFormatter is UTC-fixed). Extract
        // year/month/day using a UTC calendar so the day value matches the API string.
        // Compare against today's local year/month/day so "today"/"tomorrow" resolves
        // correctly in every timezone. See apiDateFormatter for the full convention.
        var utcCal = Calendar.current
        utcCal.timeZone = TimeZone(identifier: "UTC")!
        let localCal = Calendar.current
        let eventComponents = utcCal.dateComponents([.year, .month, .day], from: date)
        let todayComponents = localCal.dateComponents([.year, .month, .day], from: Date())
        guard let eventDay = utcCal.date(from: eventComponents),
              let todayDay = utcCal.date(from: todayComponents) else { return event.eventDate }

        let dayDiff = utcCal.dateComponents([.day], from: todayDay, to: eventDay).day ?? 0

        switch dayDiff {
        case 0:
            // Today
            return timeStr.isEmpty
                ? tr("events.list.date.today", "Hoy")
                : "\(tr("events.list.date.today", "Hoy")) · \(timeStr)"
        case 1:
            // Tomorrow
            return timeStr.isEmpty
                ? tr("events.list.date.tomorrow", "Mañana")
                : "\(tr("events.list.date.tomorrow", "Mañana")) · \(timeStr)"
        case 2...7:
            // In N days — show day count + short date.
            // dayDiff==1 (Mañana) is handled in the case above, so the minimum
            // here is 2 — "En 1 día" (singular) will never render here.
            let shortDate = formattedShortDate(date)
            let inDays = String.localizedStringWithFormat(
                tr("events.list.date.in_days", "In %lld days"),
                dayDiff
            )
            return "\(inDays) · \(shortDate)"
        default:
            // Absolute date + time
            let absDate = formattedDisplayDate(date)
            return timeStr.isEmpty ? absDate : "\(absDate) · \(timeStr)"
        }
    }

    /// True when event is today or tomorrow (dayDiff 0 or 1), and status is
    /// neither completed nor cancelled.
    /// Uses the same UTC-event / local-today day convention as relativeDateLabel.
    private func isEventUrgent(_ event: Event, parsed: Date?) -> Bool {
        guard let date = parsed,
              event.status != .completed,
              event.status != .cancelled else { return false }
        var utcCal = Calendar.current
        utcCal.timeZone = TimeZone(identifier: "UTC")!
        let localCal = Calendar.current
        let eventComponents = utcCal.dateComponents([.year, .month, .day], from: date)
        let todayComponents = localCal.dateComponents([.year, .month, .day], from: Date())
        guard let eventDay = utcCal.date(from: eventComponents),
              let todayDay = utcCal.date(from: todayComponents) else { return false }
        let dayDiff = utcCal.dateComponents([.day], from: todayDay, to: eventDay).day ?? Int.min
        return dayDiff == 0 || dayDiff == 1
    }

    // MARK: - Helpers

    /// Zero-decimal MXN for list cards — same convention as dashboard +
    /// calendar. Cents live on the event detail screen.
    private func formattedAmount(_ value: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = FeatureL10n.locale
        f.maximumFractionDigits = 0
        f.minimumFractionDigits = 0
        return f.string(from: NSNumber(value: value)) ?? "$0"
    }

    /// "15 mar 2026" — compact absolute date for beyond-7-days case.
    private func formattedDisplayDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = FeatureL10n.locale
        f.setLocalizedDateFormatFromTemplate("dMMMyyyy")
        return f.string(from: date).capitalized(with: FeatureL10n.locale)
    }

    /// "15 mar" — short date without year, used for in-N-days proximity label.
    private func formattedShortDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = FeatureL10n.locale
        f.setLocalizedDateFormatFromTemplate("dMMM")
        return f.string(from: date).capitalized(with: FeatureL10n.locale)
    }

    /// "18:00" start time component for the date lockup, or empty string when
    /// no start_time is set (all-day events omit time from the anchor).
    private func formattedTimeComponent(_ event: Event) -> String {
        guard let start = event.startTime, !start.isEmpty else { return "" }
        return String(start.prefix(5))
    }

    /// Legacy helper kept for CSV and any future callers that need the old
    /// display-date-only string.
    private func formattedDisplayDateFromString(_ dateStr: String) -> String {
        if let date = Self.apiDateFormatter.date(from: dateStr) {
            return formattedDisplayDate(date)
        }
        if let date = Self.apiDateTimeFormatter.date(from: dateStr) {
            return formattedDisplayDate(date)
        }
        return dateStr
    }

    // Convention: date-only strings from the API ("yyyy-MM-dd") represent wall-clock
    // dates with no time component. Parsing them without an explicit timezone lets
    // Foundation default to the local timezone, which shifts the date by one day for
    // users west of UTC (e.g. CDT/CST). We fix the formatter to UTC so the parsed
    // Date always lands at midnight UTC, then compare day components using a UTC
    // Calendar for the event side and the local Calendar for today — this correctly
    // resolves "today"/"tomorrow" regardless of the device's timezone.
    static let apiDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    static let apiDateTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        return f
    }()

    /// Parse an API date string (date-only or ISO datetime) into a Date value.
    /// Centralises parsing so the relative-date logic has a clean `Date?`.
    static func parseEventDate(_ dateStr: String) -> Date? {
        if let d = apiDateFormatter.date(from: dateStr) { return d }
        if let d = apiDateTimeFormatter.date(from: dateStr) { return d }
        return nil
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    private func exportCsv() {
        let content = viewModel.generateCsvContent()
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(tr("events.list.csv_filename", "eventos_solennix.csv"))
        do {
            try content.write(to: fileURL, atomically: true, encoding: .utf8)
            csvFileURL = fileURL
            showShareSheet = true
        } catch {
            // Silently fail — CSV export is not critical
        }
    }
}

// MARK: - Event Skeleton Card

/// Skeleton placeholder that mirrors the new WU1 card shape:
/// date line (bold-ish bar) + badge stub top-right, client bar,
/// caption bars, bottom row. Shares the same listRowInsets as real rows.
struct EventSkeletonCard: View {
    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Row 1: date lockup stub + badge stub
            HStack(alignment: .top) {
                SkeletonLine(width: 140, height: 17) // headline weight
                Spacer()
                SkeletonLine(width: 72, height: 22)  // badge stub
            }

            // Row 2: client name stub
            SkeletonLine(width: 180, height: 14)

            // Row 3: service type stub
            SkeletonLine(width: 120, height: 12)

            // Row 4: metadata — location + people
            HStack(spacing: Spacing.sm) {
                SkeletonLine(width: 100, height: 12)
                SkeletonLine(width: 70, height: 12)
            }

            // Separator stub
            Rectangle()
                .fill(SolennixColors.separator)
                .frame(height: 0.5)
                .padding(.leading, Spacing.xs)

            // Row 5: total amount stub (right-aligned)
            HStack {
                Spacer()
                SkeletonLine(width: 80, height: 14)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
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
