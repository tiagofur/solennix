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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var viewModel: EventListViewModel
    @State private var showShareSheet = false
    @State private var csvFileURL: URL?
    @State private var showQuickQuote = false

    /// Presents the `Personalizado` start-then-end custom-range picker (task
    /// 4.5). Flipped by `EventListPeriodFilterActions.presentCustomRangePicker`
    /// when the `Personalizado` chip is tapped. A sheet (not grid-bound) so the
    /// custom range works in BOTH `.lista` and `.calendario` modes — the spec's
    /// "Eventos in either mode" requirement.
    @State private var showCustomRangeSheet = false

    /// Long-press presentation anchor for `BlockDateSheet` in `.calendario`
    /// (task 4.4). Non-nil while the block sheet is presented for a day; the
    /// `.sheet(item:)` reads + clears it. A long-press sets this WITHOUT calling
    /// `selectDate` (see `EventListCalendarGestures.handleLongPress`), so opening
    /// the block sheet never applies the day-tap filter as a side effect.
    @State private var blockSheetAnchor: BlockSheetAnchor?

    /// Unified Eventos view-mode toggle (ADR-7). Lives on the VIEW as `@State`
    /// (default `.lista`), NOT `@AppStorage` — it is ephemeral and toggling it
    /// MUST NOT reload events or drop the current selection. Both `.lista` and
    /// `.calendario` read the SAME `viewModel`; the toggle only swaps the
    /// rendered subtree. Phase 4.3 swaps the Calendario placeholder for the
    /// real moved `CalendarGridView` + reused `eventCard`.
    @State private var viewMode: EventosViewMode = .lista

    /// Presents the `BlockedDatesSheet` (Phase 5, Cambio 5) — the discoverable
    /// management surface for blocked dates. Flipped from a toolbar button that
    /// is ONLY rendered in `.calendario` (the long-press → `BlockDateSheet`
    /// still creates blocks; this sheet reviews/removes them).
    @State private var showBlockedDatesSheet = false

    /// First-run onboarding tip (task 4.7, spec "First-Run Onboarding Tip").
    /// Gated by the SINGLE `@AppStorage` flag owned by
    /// `EventosOnboardingTipGate`: shown once on the first appearance of the
    /// unified Eventos screen, suppressed forever after dismissal. The flag is
    /// the sole source of truth — NOT the view-mode toggle's state — so the tip
    /// never reappears on a subsequent launch regardless of which mode the user
    /// lands in. See `EventosOnboardingTipGate` for the pure gating contract.
    @AppStorage(EventosOnboardingTipGate.storageKey) private var eventosOnboardingShown = false

    // TipKit tips
    private let newEventTip = NewEventTip()
    private let quickQuoteTip = QuickQuoteTip()
    private let onboardingTip = EventosOnboardingTip()

    @ScaledMetric(relativeTo: .largeTitle) private var emptyIconSize: CGFloat = 40

    // MARK: - Init

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: EventListViewModel(apiClient: apiClient))
    }

    // MARK: - Body

    public var body: some View {
        content
            .background(SolennixColors.surfaceGrouped)
            .softScrollEdgeEffectIfAvailable()
            // Haptic feedback when the destructive delete confirmation appears (true only).
            .sensoryFeedback(.warning, trigger: viewModel.showDeleteConfirm) { _, newValue in newValue }
            .navigationTitle(tr("events.list.title", "Eventos"))
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchQuery, prompt: tr("events.list.search_placeholder", "Buscar eventos..."))
            .searchMinimizedIfAvailable()
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 0) {
                    // Content-header view-mode toggle (ADR-7). Visible in BOTH
                    // modes; flipping it only switches the rendered subtree — it
                    // never reloads events nor touches the ViewModel's
                    // selectedDay/filters (the toggle holds only a binding).
                    EventosViewModeToggle(viewMode: $viewMode)
                        // First-run onboarding tip (task 4.7), anchored on the
                        // `Lista | Calendario` toggle because the tip explains
                        // exactly that affordance. The presenter gates the
                        // popover on the single `@AppStorage` flag and persists
                        // it true once TipKit reports the tip dismissed — so it
                        // shows on the first run and never again. See
                        // `EventosOnboardingTipPresenter`.
                        .eventosOnboardingTip(onboardingTip, shown: $eventosOnboardingShown)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)

                    // Period-filter chips `Hoy · Esta semana · Este mes ·
                    // Personalizado` (task 4.5). Shown ONLY in `.lista` (Phase 5
                    // UX fix): in Calendario the grid itself is the date filter,
                    // so the chips would be redundant and compete with the grid
                    // for the user's attention. They stay pinned in the top
                    // safe-area inset (in Lista) so the active filter survives an
                    // empty / filtered-empty state without trapping the user.
                    if viewMode == .lista {
                        EventListPeriodFilterBar(viewModel: viewModel) {
                            showCustomRangeSheet = true
                        }
                        .padding(.vertical, Spacing.xs)
                    }

                    // Only static banners live in safeAreaInset below the chips.
                    if viewModel.isShowingCachedData {
                        CachedDataBanner()
                            .background(SolennixColors.surfaceGrouped)
                    }
                }
            }
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                viewModel.setCacheManager(cacheManager)
                await viewModel.loadEvents()
                // Load blocked/unavailable dates so the calendar grid can show
                // them (critical bug: loadUnavailableDates existed but was never
                // called, so blocked dates never rendered in calendar mode).
                await viewModel.loadUnavailableDates()
            }
            // Phase 5 UX: switching modes clears the OTHER mode's filter residue
            // so neither carries a stale selection across (see
            // `EventListViewModel.clearFiltersForViewMode`). A flip is still
            // purely presentational — it never reloads `events` or moves the grid
            // month (asserted by `testClearFiltersForViewModeNeverTouches…`).
            .onChange(of: viewMode) { _, newMode in
                viewModel.clearFiltersForViewMode(newMode)
            }
            .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    // 1. Create (event or quick quote)
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

                    // 2. Sort + export
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

                    // 3. Filters — status-only (task 4.6, spec "Events App Bar"
                    // MODIFIED). The legacy `calendar` date-range filter button
                    // (the one that opened `DateFilterSheet`) was REMOVED: the
                    // content-header `Lista | Calendario` toggle + the period
                    // chips (task 4.5) are the sole calendar entry, so a second
                    // date-range button in the app bar was redundant.
                    //
                    // `EventosAppBarFilter.allCases` is the single source of
                    // truth — the toolbar renders EXACTLY the filter affordances
                    // listed there (currently just `.status`), in both `.lista`
                    // and `.calendario` (this toolbar is shared). A calendar
                    // filter button cannot reappear unless `.calendar` is added
                    // back to that enum (guarded by `EventListViewAppBarTests`).
                    ForEach(EventosAppBarFilter.allCases, id: \.self) { filter in
                        switch filter {
                        case .status:
                            EventosStatusFilterMenu(
                                selectedStatus: $viewModel.selectedStatus,
                                statusFilters: viewModel.statusFilters
                            )
                        }
                    }

                    // 4. Blocked-dates management (Phase 5, Cambio 5) — ONLY in
                    // `.calendario`. A discoverable entry to review/remove blocked
                    // dates (the long-press → `BlockDateSheet` still CREATES them).
                    // This is a management affordance, NOT a filter, so it lives
                    // outside `EventosAppBarFilter` (which guards the FILTER set and
                    // is asserted by `EventListViewAppBarTests` to stay `[.status]`).
                    if viewMode == .calendario {
                        Button {
                            showBlockedDatesSheet = true
                        } label: {
                            Image(systemName: "calendar.badge.exclamationmark")
                                .font(.body)
                                .foregroundStyle(SolennixColors.primary)
                                .symbolEffect(.bounce, value: viewModel.unavailableDates.count)
                        }
                        .accessibilityLabel(tr("events.list.toolbar.blocked_dates", "Fechas bloqueadas"))
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
            .sheet(item: $blockSheetAnchor) { anchor in
                // Long-press → BlockDateSheet (task 4.4). The anchor carries the
                // long-pressed day; opening the sheet does NOT apply the day-tap
                // filter (the gesture seam guarantees that).
                //
                // NOTE (scope-preserving deviation, mirrors 4.3): the existing
                // `BlockDateSheet` is typed `@Bindable var viewModel: CalendarViewModel`.
                // Binding it to the unified `EventListViewModel` requires the
                // Phase 6.1 retype (out of scope for 4.4), and constructing a
                // throwaway `CalendarViewModel` would reintroduce the parallel VM
                // this change eliminates. So this batch wires the GESTURE + flips
                // the presentation state (the testable contract — gesture
                // separation + sheet opens for that day); Phase 6.1 swaps this
                // transitional body for the retyped `BlockDateSheet` bound to
                // `EventListViewModel` (with its future `toggleDateBlock`).
                blockDateSheet(for: anchor.day)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showCustomRangeSheet) {
                // `Personalizado` chip → start-then-end custom-range picker
                // (task 4.5). The seam's `selectChip(.custom)` flipped this flag.
                // On Apply the picker records start then end on the ViewModel via
                // the dedicated custom-range setters from 3.3 (the spec's "two
                // sequential taps → [start, end] inclusive"). A sheet so the
                // custom range works in BOTH modes.
                PeriodCustomRangeSheet(viewModel: viewModel)
                    .presentationDetents([.height(360)])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showBlockedDatesSheet) {
                // Blocked-dates management (Phase 5, Cambio 5). Reads the SAME
                // `unavailableDates` the grid renders from, so deleting a row
                // here updates the grid's blocked indicators on dismiss.
                BlockedDatesSheet(viewModel: viewModel)
            }
            .confirmationDialog(
                tr("events.list.delete_confirm.title", "Eliminar evento"),
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { event in
                Button(tr("events.list.actions.delete", "Eliminar"), role: .destructive) {
                    guard let removed = viewModel.softDeleteEvent(event) else { return }
                    HapticsHelper.play(.success)
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
                }
            }
    }

    // MARK: - Personalizado Custom-Range Sheet (task 4.5)

    /// Start-then-end date picker for the `Personalizado` chip. Presented as a
    /// sheet (so the custom range works in BOTH `.lista` and `.calendario`
    /// modes — the spec's "either mode" requirement). On Apply it records start
    /// then end on the unified ViewModel via the dedicated custom-range setters
    /// from 3.3 (`selectCustomRangeStart` → `selectCustomRangeEnd`), which is the
    /// spec's "two sequential taps → `[start, end]` inclusive" flow. Seeds from
    /// any existing custom range so re-editing keeps the prior selection.
    private struct PeriodCustomRangeSheet: View {
        @Bindable var viewModel: EventListViewModel
        @Environment(\.dismiss) private var dismiss

        @State private var start: Date
        @State private var end: Date

        init(viewModel: EventListViewModel) {
            self.viewModel = viewModel
            _start = State(initialValue: viewModel.dateRangeStart ?? Date())
            _end = State(initialValue: viewModel.dateRangeEnd ?? Date())
        }

        private func tr(_ key: String, _ value: String) -> String {
            FeatureL10n.text(key, value)
        }

        var body: some View {
            NavigationStack {
                Form {
                    Section {
                        DatePicker(
                            tr("events.list.period.custom_start", "Fecha de inicio"),
                            selection: $start,
                            displayedComponents: .date
                        )
                        .solennixRow()
                    }
                    Section {
                        DatePicker(
                            tr("events.list.period.custom_end", "Fecha de fin"),
                            selection: $end,
                            displayedComponents: .date
                        )
                        .solennixRow()
                    }
                }
                .solennixListStyle()
                .navigationTitle(tr("events.list.period.custom", "Personalizado"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        SolennixCancelButton(title: tr("common.cancel", "Cancelar")) {
                            dismiss()
                        }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(tr("events.list.filters.apply", "Aplicar")) {
                            // Two-tap custom range wiring (spec "start then end"):
                            // the dedicated 3.3 setters set `.custom` + order/clamp
                            // the bounds. A chip and a day-tap stay mutually
                            // exclusive against the same `dateRange*` surface.
                            viewModel.selectCustomRangeStart(start)
                            viewModel.selectCustomRangeEnd(end)
                            dismiss()
                        }
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.primary)
                    }
                }
            }
        }
    }

    // MARK: - Content (view-mode switch, ADR-7)

    /// Routes the body by `viewMode`. `.lista` keeps the existing events list;
    /// `.calendario` renders the `EventosLayoutFactory` split/stack seam with
    /// REAL content injected (ADR-8): the reused `CalendarGridView` (still at
    /// `Calendar/Views/` — formal move is Phase 6) for the month grid with
    /// status dots, and the SAME `eventCard(_:)` builder `.lista` uses for the
    /// filtered-list rows. Both branches read the SAME `viewModel` — switching
    /// `viewMode` is purely presentational and never reloads events or drops the
    /// selection. Because the factory renders the filtered list through the ONE
    /// injected `eventCard` cell in both modes, `.calendario` reuses `eventCard`
    /// by construction and no distinct `eventRowContent` row can appear (spec
    /// scenario "Calendario reuses eventCard").
    @ViewBuilder
    private var content: some View {
        switch viewMode {
        case .lista:
            eventList
        case .calendario:
            EventosLayoutFactory.make(
                vm: viewModel,
                viewMode: viewMode,
                sizeClass: sizeClass,
                grid: { calendarioGrid },
                cell: { event in eventCard(event) }
            )
        }
    }

    // MARK: - Calendario Grid (Phase 4.3) + Day Interactions (Phase 4.4)

    /// The reused `CalendarGridView`, driven by the unified ViewModel's grid
    /// derivations (`daysInMonth`, `eventDotsForDay`, `eventOverflowForDay`,
    /// `isDateBlocked`, `selectedDay`). Renders the current month with status
    /// dots and blocked-date indicators. The file is NOT moved here — its formal
    /// move into `Events/Views/` is Phase 6; it is used from its current
    /// `Calendar/Views/` location.
    ///
    /// Day interactions (task 4.4) are wired through `EventListCalendarGestures`,
    /// a stateless seam that routes each of the grid's two distinct gestures to
    /// exactly one action and guarantees they cannot trigger each other:
    ///   • tap        → `viewModel.selectDate(day)`  (single-day filter)
    ///   • long-press → open `BlockDateSheet` for the day WITHOUT `selectDate`
    /// `CalendarGridView` already separates the two at the UIKit level
    /// (`onTapGesture` vs `simultaneousGesture(LongPressGesture(...))`); the seam
    /// only forwards each callback, so the gesture-separation invariant holds by
    /// construction.
    @ViewBuilder
    private var calendarioGrid: some View {
        VStack(spacing: Spacing.sm) {
            // Month navigation header: prev / title / next, plus a "Hoy" button.
            // These affordances were on the old `CalendarViewModel`; the unified
            // VM now owns `goToNextMonth` / `goToPreviousMonth` / `goToToday`, so
            // the calendar mode is navigable again (critical bug fix).
            HStack {
                Button {
                    HapticsHelper.play(.selection)
                    viewModel.goToPreviousMonth()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.primary)
                }
                .accessibilityLabel(tr("events.calendar.previous_month", "Mes anterior"))

                Spacer()

                Text(viewModel.monthTitle)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)

                Spacer()

                Button {
                    HapticsHelper.play(.selection)
                    viewModel.goToNextMonth()
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.headline)
                        .foregroundStyle(SolennixColors.primary)
                }
                .accessibilityLabel(tr("events.calendar.next_month", "Mes siguiente"))
            }

            // "Hoy" affordance — snaps the grid back to the current month.
            Button {
                HapticsHelper.play(.selection)
                viewModel.goToToday()
            } label: {
                Text(tr("events.calendar.today", "Hoy"))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.primary)
            }
            .accessibilityLabel(tr("events.calendar.today", "Hoy"))

            CalendarGridView(
                days: viewModel.daysInMonth,
                eventDotsForDay: viewModel.eventDotsForDay,
                eventOverflowForDay: viewModel.eventOverflowForDay,
                isDateBlocked: viewModel.isDateBlocked,
                selectedDate: viewModel.selectedDay,
                onSelectDate: { day in calendarGestures.handleTap(day) },
                onLongPressDate: { day in calendarGestures.handleLongPress(day) }
            )
        }
    }

    /// The gesture-wiring seam for the `.calendario` grid (task 4.4). Built fresh
    /// from current state each access; it holds no state of its own. The
    /// `presentBlockSheet` closure flips `blockSheetAnchor`, which drives the
    /// `.sheet(item:)` below — keeping the seam free of SwiftUI presentation state.
    private var calendarGestures: EventListCalendarGestures {
        EventListCalendarGestures(
            viewModel: viewModel,
            presentBlockSheet: { day in blockSheetAnchor = BlockSheetAnchor(day: day) }
        )
    }

    /// Identifiable presentation anchor for the block-date sheet. Carries the
    /// long-pressed day so the sheet knows which date to block. (A dedicated
    /// wrapper avoids a `@retroactive` `Date: Identifiable` conformance.)
    private struct BlockSheetAnchor: Identifiable, Equatable {
        let day: Date
        var id: Date { day }
    }

    /// Real block-date sheet body (Phase 6.1). `BlockDateSheet` is now retyped
    /// to `EventListViewModel` and wired to `toggleDateBlock`.
    @ViewBuilder
    private func blockDateSheet(for day: Date) -> some View {
        BlockDateSheet(
            startDate: day,
            viewModel: viewModel,
            onDismiss: { blockSheetAnchor = nil }
        )
    }

    // MARK: - Event List

    @ViewBuilder
    private var eventList: some View {
        if sizeClass == .regular {
            // iPad: keep the ScrollView+LazyVGrid layout unchanged.
            // The ScrollView root ensures large title tracking and the
            // grid provides multi-column density.
            ScrollView {
                eventListContent
            }
        } else {
            // iPhone: native List for pull-to-refresh, swipe actions,
            // and correct keyboard avoidance.
            iPhoneEventList
        }
    }

    /// iPhone-only event list built on native `List` so swipe actions work.
    @ViewBuilder
    private var iPhoneEventList: some View {
        let filtered = viewModel.filteredEvents

        if viewModel.isLoading && viewModel.events.isEmpty {
            List {
                skeletonRows
            }
            .listStyle(.insetGrouped)
            .solennixListStyle()
        } else if let error = viewModel.errorMessage, filtered.isEmpty, !viewModel.isLoading {
            // Error state — outside List for proper centering
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: tr("events.list.error.load_title", "Error al cargar"),
                message: error,
                actionTitle: tr("events.list.error.retry", "Reintentar"),
                iconColor: SolennixColors.primary
            ) {
                Task { await viewModel.loadEvents() }
            }
            .padding(.top, Spacing.xl)
        } else if filtered.isEmpty && !viewModel.isLoading {
            // Empty state — outside List for proper centering
            emptyState
        } else {
            List {
                ForEach(filtered) { event in
                    // Inline ZStack: row content behind an opacity-0 NavigationLink
                    // so taps navigate without showing the disclosure chevron.
                    // All list chrome (background, separator) lives on the row modifier
                    // — no card shadow/clip/manual insets (matches ClientListView).
                    ZStack {
                        eventCard(event)
                        NavigationLink(value: Route.eventDetail(id: event.id)) {
                            EmptyView()
                        }
                        .opacity(0)
                    }
                    .solennixRow()
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                    .alignmentGuide(.listRowSeparatorLeading) { d in d[.leading] }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(cardAccessibilityLabel(event))
                    .accessibilityAddTraits(.isButton)
                    // Edit and Checklist are exposed through the context-menu rotor automatically.
                    // Only the delete action needs an explicit wired entry here.
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
                        // Fix 13: navy accent instead of blue — differentiates edit from destructive red
                        .tint(SolennixColors.accent)
                    }
                    .swipeActions(edge: .leading, allowsFullSwipe: false) {
                        NavigationLink(value: Route.eventChecklist(id: event.id)) {
                            Label(tr("events.list.actions.checklist", "Checklist"), systemImage: "checklist")
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .solennixListStyle()
        }
    }

    // MARK: - Skeleton Placeholder

    /// Skeleton rows using insetGrouped surface: listRowBackground card, separator tint,
    /// no manual insets or shadows — matches ClientSkeletonCard treatment in ClientListView.
    @ViewBuilder
    private var skeletonRows: some View {
        ForEach(0..<5, id: \.self) { _ in
            EventSkeletonCard()
                .solennixRow()
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    /// iPad-only skeleton used inside the ScrollView+LazyVGrid path.
    /// Wraps cards in a vertical stack with manual insets (same as before migration).
    private var skeletonCards: some View {
        LazyVStack(spacing: Spacing.sm) {
            ForEach(0..<5, id: \.self) { _ in
                EventSkeletonCard()
                    .padding(.horizontal, Spacing.md)
            }
        }
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
                actionTitle: tr("events.list.error.retry", "Reintentar"),
                iconColor: SolennixColors.primary
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
                    message: tr("events.list.empty.first_run_message", "Registra tus eventos para llevar el control de fechas, clientes y pagos en un solo lugar."),
                    iconColor: SolennixColors.primary
                )

                NavigationLink(value: Route.eventForm()) {
                    Text(tr("events.list.empty.first_run_cta", "Crear evento"))
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
                FeatureL10n.plural("events.list.people_count", "%lld people", count: event.numPeople),
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
            withAnimation(reduceMotion ? nil : .snappy) {
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
            let inDays = FeatureL10n.plural("events.list.date.in_days", "In %lld days", count: dayDiff)
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
