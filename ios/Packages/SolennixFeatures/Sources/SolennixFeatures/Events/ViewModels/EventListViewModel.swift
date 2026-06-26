import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Sort

/// Ordering axis for the events list. Each case pairs with `sortAscending`
/// to derive the final comparator.
public enum EventSortField: String, CaseIterable, Sendable {
    case eventDate
    case serviceType
    case clientName
    case totalAmount
}

/// Period filter chips shared by Lista + Calendario (ADR-7). A non-nil
/// `periodFilter` means a chip is active. `.custom` ("Personalizado") defers the
/// actual bounds to the `dateRange*` pair set by the two-tap custom range
/// (`selectCustomRangeStart` / `selectCustomRangeEnd`); the bounded chips
/// (`.today` / `.thisWeek` / `.thisMonth`) recompute that pair from
/// `Calendar.current`.
public enum EventPeriodFilter: String, CaseIterable, Sendable, Equatable {
    case today, thisWeek, thisMonth, custom
}

// MARK: - Event List View Model

@Observable
public final class EventListViewModel {

    // MARK: - State

    public var events: [Event] = []
    public var clients: [Client] = []
    public var searchQuery: String = ""
    public var selectedStatus: EventStatus? = nil
    public var dateRangeStart: Date? = nil
    public var dateRangeEnd: Date? = nil

    // MARK: - Unified calendar state (ADR-7)
    //
    // Folded in from `CalendarViewModel` so Lista + Calendario share ONE filter
    // surface. Both modes read the same `events` array and the same `dateRange*`
    // pair — a day-tap and a period chip BOTH write `dateRange*`, so
    // `filteredEvents` stays a single code path. `viewMode` itself lives on the
    // VIEW (`EventListView`), default `.lista` and NOT persisted — toggling it
    // never touches `events`/`selectedDay`/filters.

    /// Active period chip, or `nil` when no chip is active (a day-tap clears it).
    public var periodFilter: EventPeriodFilter? = nil
    /// The day the user tapped in the grid; `nil` shows all events in range.
    public var selectedDay: Date? = nil
    /// The month the grid is showing (anchors to the start of the current month).
    public var currentMonth: Date = {
        let now = Date()
        return Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: now)) ?? now
    }()
    /// Blocked/unavailable dates (from `CalendarViewModel`).
    public var unavailableDates: [UnavailableDate] = []
    /// True while a block/unblock request is in flight (from `CalendarViewModel`).
    public var isBlockingDate: Bool = false
    /// Typed last calendar error (load/block/unblock); the view maps it to a
    /// localized string. `CalendarError` is currently declared in
    /// `CalendarViewModel.swift` (moved to `Events/Models` in Phase 6).
    public var calendarError: CalendarError? = nil

    public var sortField: EventSortField = .eventDate
    /// For `eventDate` and `totalAmount` we default to DESC (latest / highest
    /// first — that's how organizers scan a list). For string fields we
    /// default to ASC (A → Z). Changed via the toolbar Menu.
    public var sortAscending: Bool = false
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    public var showAdvancedFilters: Bool = false
    public var deleteTarget: Event?
    public var showDeleteConfirm: Bool = false
    /// ID of the event whose status is being mutated — used to show a
    /// spinner on that row so the rest of the list stays interactive.
    public var updatingStatusEventId: String? = nil

    /// Whether the current data was loaded from cache (not fresh from API).
    public var isShowingCachedData: Bool = false

    // MARK: - Dependencies

    private let apiClient: APIClient
    /// Single event-mutation surface (ADR-2). `confirmDeleteEvent` and
    /// `updateEventStatus` route through this repository so every list-path
    /// mutation fans out to the system calendar consistently. Reading the
    /// events list (loadEvents/refresh) stays on `apiClient` — ADR-2 covers the
    /// *mutation* sites only; reading is not a mutation.
    public let eventRepository: any EventRepository
    private var cacheManager: CacheManager?
    private let cacheMaxAge: TimeInterval = 30 * 60

    // MARK: - Init

    /// - Parameters:
    ///   - apiClient: kept for list reads (`loadEvents`/`refresh`) + cache, which
    ///     are NOT mutations and stay on `APIClient` per ADR-2.
    ///   - eventRepository: the mutation boundary. When `nil`, a production
    ///     default is wired so existing `init(apiClient:)` call sites keep
    ///     compiling AND route mutations through the repository. Tests inject a
    ///     mock-backed repository.
    public init(apiClient: APIClient, eventRepository: (any EventRepository)? = nil) {
        self.apiClient = apiClient
        self.eventRepository = eventRepository ?? DefaultEventRepository.makeDefault(eventAPI: apiClient)
    }

    /// Set the cache manager for offline support.
    public func setCacheManager(_ manager: CacheManager?) {
        self.cacheManager = manager
    }

    // MARK: - Client Map

    private var clientMap: [String: Client] {
        Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0) })
    }

    public func clientName(for clientId: String) -> String {
        clientMap[clientId]?.name ?? tr("events.list.client_fallback", "Cliente")
    }

    // MARK: - Status Filters

    public var statusFilters: [(status: EventStatus?, label: String, count: Int)] {
        let counts = Dictionary(grouping: events, by: { $0.status }).mapValues { $0.count }
        return [
            (nil, tr("events.list.status.all", "Todos"), events.count),
            (.quoted, tr("events.list.status.quoted", "Cotizado"), counts[.quoted] ?? 0),
            (.confirmed, tr("events.list.status.confirmed", "Confirmado"), counts[.confirmed] ?? 0),
            (.completed, tr("events.list.status.completed", "Completado"), counts[.completed] ?? 0),
            (.cancelled, tr("events.list.status.cancelled", "Cancelado"), counts[.cancelled] ?? 0)
        ]
    }

    // MARK: - Filtered Events

    /// Number of active advanced filters (date range is the only one now —
    /// the client picker was dropped for cross-platform parity; Android and
    /// Web never had it).
    public var activeFilterCount: Int {
        (dateRangeStart != nil || dateRangeEnd != nil) ? 1 : 0
    }

    /// Clears all advanced filters (currently just date range).
    public func clearAdvancedFilters() {
        dateRangeStart = nil
        dateRangeEnd = nil
    }

    // MARK: - Calendar Grid Derivations (Phase 4.3 / ADR-7)
    //
    // Read-only helpers ported from `CalendarViewModel` so the `.calendario`
    // body can drive the reused `CalendarGridView` (status dots, blocked dates,
    // selection) from the SAME unified state. Both Lista and Calendario read the
    // same `events`/`currentMonth`/`unavailableDates`/`selectedDay`, so the grid
    // stays in sync with the filtered list. Phase 6 deletes `CalendarViewModel`
    // and these become the single source of truth.

    // DEVICE-local formatter (NO UTC pin). Every grid cell `Date` is built from
    // `Calendar.current` (local-midnight) and represents a LOCAL calendar day,
    // so a local formatter yields the correct yyyy-MM-dd key in every timezone.
    // POSIX locale keeps the numerals stable regardless of language. Mirrors
    // `CalendarViewModel.apiDateFormatter` exactly so grid behavior is
    // identical during the migration.
    private static let gridApiDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let gridMonthFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = FeatureL10n.locale
        f.setLocalizedDateFormatFromTemplate("MMMM yyyy")
        return f
    }()

    /// Array of `DateDay` structs for the current-month grid, with leading
    /// empty slots so the first day aligns to the correct weekday column.
    /// Locale-aware offset matches `CalendarGridView`'s header rotation.
    public var daysInMonth: [DateDay] {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: currentMonth)
        guard let firstOfMonth = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth)
        else { return [] }

        let rawWeekday = calendar.component(.weekday, from: firstOfMonth)
        let leadingBlanks = (rawWeekday - calendar.firstWeekday + 7) % 7

        let today = Date()
        let todayComponents = calendar.dateComponents([.year, .month, .day], from: today)
        let selectedComponents: DateComponents? = selectedDay.map {
            calendar.dateComponents([.year, .month, .day], from: $0)
        }

        var days: [DateDay] = []

        if leadingBlanks > 0 {
            guard let lastDayPrev = calendar.date(byAdding: .day, value: -1, to: firstOfMonth),
                  let prevMonthRange = calendar.range(of: .day, in: .month, for: lastDayPrev)
            else { return [] }
            for i in 0..<leadingBlanks {
                let dayNum = prevMonthRange.upperBound - leadingBlanks + i
                if let date = calendar.date(byAdding: .day, value: -(leadingBlanks - i), to: firstOfMonth) {
                    days.append(DateDay(
                        date: date,
                        dayNumber: dayNum,
                        isCurrentMonth: false,
                        isToday: false,
                        isSelected: false
                    ))
                }
            }
        }

        for day in range {
            var dayComponents = components
            dayComponents.day = day
            guard let date = calendar.date(from: dayComponents) else { continue }

            let dc = calendar.dateComponents([.year, .month, .day], from: date)
            let isToday = dc.year == todayComponents.year
                && dc.month == todayComponents.month
                && dc.day == todayComponents.day
            let isSelected: Bool = {
                guard let sc = selectedComponents else { return false }
                return dc.year == sc.year && dc.month == sc.month && dc.day == sc.day
            }()

            days.append(DateDay(
                date: date,
                dayNumber: day,
                isCurrentMonth: true,
                isToday: isToday,
                isSelected: isSelected
            ))
        }

        return days
    }

    /// Up to 3 status-colored dots for a given day. Each dot represents ONE
    /// UNIQUE STATUS (not one event). Honors `selectedStatus` so grid dots stay
    /// in sync with the list filter.
    public func eventDotsForDay(_ date: Date) -> [EventStatus] {
        let dateStr = Self.gridApiDateFormatter.string(from: date)
        let dayEvents = events
            .filter { $0.eventDate == dateStr }
            .filter { selectedStatus == nil || $0.status == selectedStatus }

        var seen: Set<EventStatus> = []
        var dots: [EventStatus] = []
        for event in dayEvents {
            if !seen.contains(event.status) {
                seen.insert(event.status)
                dots.append(event.status)
                if dots.count >= 3 { break }
            }
        }
        return dots
    }

    /// How many events on a day are NOT rendered as dots:
    /// `totalEvents - min(uniqueStatusesCount, 3)`. Drives the "+N más" caption.
    public func eventOverflowForDay(_ date: Date) -> Int {
        let dateStr = Self.gridApiDateFormatter.string(from: date)
        guard !events.isEmpty else { return 0 }
        let dayEvents = events
            .filter { $0.eventDate == dateStr }
            .filter { selectedStatus == nil || $0.status == selectedStatus }
        let uniqueStatusCount = Set(dayEvents.map { $0.status }).count
        return max(0, dayEvents.count - Swift.min(uniqueStatusCount, 3))
    }

    /// True when the day falls inside any `UnavailableDate` range.
    public func isDateBlocked(_ date: Date) -> Bool {
        let dateStr = Self.gridApiDateFormatter.string(from: date)
        return unavailableDates.contains { $0.startDate <= dateStr && dateStr <= $0.endDate }
    }

    /// Formatted month title, e.g. "Marzo de 2026" / "March 2026".
    public var monthTitle: String {
        let formatter = Self.gridMonthFormatter
        if formatter.locale != FeatureL10n.locale {
            formatter.locale = FeatureL10n.locale
        }
        let original = formatter.string(from: currentMonth)
        guard !original.isEmpty else { return "" }
        return original.prefix(1).uppercased() + original.dropFirst()
    }

    // MARK: - Month Navigation (CalendarViewModel parity)
    //
    // Month navigation for the `.calendario` grid. The grid anchors to the
    // START of a month, so adding/subtracting whole months from a month-start
    // `currentMonth` stays on a month-start boundary. Each navigation drops
    // `selectedDay` — a day selection from a previous month is no longer valid
    // once the grid shows a different month.

    /// Advance to the next month.
    public func goToNextMonth() {
        let calendar = Calendar.current
        currentMonth = calendar.date(byAdding: .month, value: 1, to: currentMonth) ?? currentMonth
        selectedDay = nil
    }

    /// Go back to the previous month.
    public func goToPreviousMonth() {
        let calendar = Calendar.current
        currentMonth = calendar.date(byAdding: .month, value: -1, to: currentMonth) ?? currentMonth
        selectedDay = nil
    }

    /// Snap back to the current month (the "Today" affordance).
    public func goToToday() {
        let now = Date()
        let calendar = Calendar.current
        currentMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) ?? now
        selectedDay = nil
    }

    // MARK: - Unavailable Dates (moved from CalendarViewModel in Phase 6)

    /// Look up the `UnavailableDate` entry that covers a given day, if any.
    public func unavailableDateFor(_ date: Date) -> UnavailableDate? {
        let dateStr = Self.gridApiDateFormatter.string(from: date)
        return unavailableDates.first { $0.startDate <= dateStr && dateStr <= $0.endDate }
    }

    /// Block a date range, or unblock if it is already blocked.
    @MainActor
    public func toggleDateBlock(startDate: Date, endDate: Date, reason: String?) async {
        calendarError = nil
        isBlockingDate = true
        let wasBlocked = unavailableDateFor(startDate) != nil
        do {
            if let existing = unavailableDateFor(startDate) {
                try await apiClient.delete(Endpoint.unavailableDate(existing.id))
            } else {
                let startStr = Self.gridApiDateFormatter.string(from: startDate)
                let endStr = Self.gridApiDateFormatter.string(from: endDate)
                struct BlockRequest: Encodable {
                    let startDate: String
                    let endDate: String
                    let reason: String?
                }
                let body = BlockRequest(startDate: startStr, endDate: endStr, reason: reason)
                let _: UnavailableDate = try await apiClient.post(Endpoint.unavailableDates, body: body)
            }
            await loadUnavailableDates()
        } catch {
            self.calendarError = wasBlocked ? .unblockFailed : .blockFailed
        }
        isBlockingDate = false
    }

    /// Delete a specific blocked date entry by ID.
    @MainActor
    public func deleteBlock(_ entry: UnavailableDate) async {
        isBlockingDate = true
        do {
            try await apiClient.delete(Endpoint.unavailableDate(entry.id))
            await loadUnavailableDates()
        } catch {
            self.calendarError = .unblockFailed
        }
        isBlockingDate = false
    }

    @MainActor
    public func loadUnavailableDates() async {
        let now = Date()
        let calendar = Calendar.current
        guard let startDate = calendar.date(byAdding: .month, value: -6, to: now),
              let endDate = calendar.date(byAdding: .month, value: 6, to: now)
        else { return }

        let startStr = Self.gridApiDateFormatter.string(from: startDate)
        let endStr = Self.gridApiDateFormatter.string(from: endDate)

        do {
            let fetched: [UnavailableDate] = try await apiClient.getAll(
                Endpoint.unavailableDates,
                params: ["start": startStr, "end": endStr]
            )
            unavailableDates = fetched
        } catch {
            self.calendarError = .loadFailed
        }
    }

    // MARK: - Shared Filter Invariant (ADR-7)
    //
    // A day-tap and a period chip BOTH write the same `dateRange*` pair, so
    // `filteredEvents` stays one code path in Lista AND Calendario. Each clears
    // the other's selection (mutual-clearing invariant):
    //   • `selectDate(day)`        → selectedDay = day, dateRange* = that day,
    //                                 periodFilter = nil
    //   • `setPeriodFilter(_)`     → periodFilter = chip, dateRange* recomputed
    //                                 from Calendar.current, selectedDay = nil
    // The view (Phase 4) wires the taps; the VM owns the state + setters.

    /// Day-tap: filter to a single day. Sets `selectedDay`, bounds the range to
    /// that day's start-of-day, and clears any active period chip.
    public func selectDate(_ day: Date) {
        // Toggle-off (Phase 5 UX): tapping the ALREADY-SELECTED day clears it,
        // returning to the unfiltered "show all" baseline (the same state month
        // navigation produces). Mirrors the clearable-chip behavior.
        if selectedDay == day {
            selectedDay = nil
            periodFilter = nil
            dateRangeStart = nil
            dateRangeEnd = nil
            return
        }
        selectedDay = day
        periodFilter = nil
        let start = Calendar.current.startOfDay(for: day)
        dateRangeStart = start
        dateRangeEnd = start
    }

    /// Period chip (Hoy / Esta semana / Este mes / Personalizado): sets the
    /// period, recomputes `dateRange*` from `Calendar.current`, and clears
    /// `selectedDay`. `.custom` defers to the two-tap custom-range setters
    /// (it clears any prior range so re-tapping the chip resets cleanly).
    public func setPeriodFilter(_ filter: EventPeriodFilter) {
        // Toggle-off (Phase 5 UX): tapping the ALREADY-ACTIVE chip clears it, so
        // the user can always recover to "show all" by re-tapping the active chip
        // (Apple HIG clearable control). Applies to every chip incl. `.custom`.
        if periodFilter == filter {
            periodFilter = nil
            selectedDay = nil
            dateRangeStart = nil
            dateRangeEnd = nil
            return
        }
        periodFilter = filter
        selectedDay = nil
        let calendar = Calendar.current
        switch filter {
        case .today:
            let start = calendar.startOfDay(for: Date())
            dateRangeStart = start
            dateRangeEnd = start
        case .thisWeek:
            applyInclusiveDateInterval(calendar.dateInterval(of: .weekOfYear, for: Date()))
        case .thisMonth:
            applyInclusiveDateInterval(calendar.dateInterval(of: .month, for: Date()))
        case .custom:
            dateRangeStart = nil
            dateRangeEnd = nil
        }
    }

    /// First tap of the Personalizado two-tap range: records the start, clears
    /// the end (pending the second tap), and marks the period as `.custom`.
    public func selectCustomRangeStart(_ day: Date) {
        periodFilter = .custom
        selectedDay = nil
        dateRangeStart = Calendar.current.startOfDay(for: day)
        dateRangeEnd = nil
    }

    /// Second tap of the Personalizado two-tap range: records the end. Requires
    /// a prior `selectCustomRangeStart`; if none, this tap seeds both bounds.
    public func selectCustomRangeEnd(_ day: Date) {
        periodFilter = .custom
        let end = Calendar.current.startOfDay(for: day)
        let start = dateRangeStart ?? end
        dateRangeStart = Swift.min(start, end)
        dateRangeEnd = Swift.max(start, end)
    }

    /// Clears the filter state that belongs to the OTHER view mode, so switching
    /// Lista ↔ Calendario never carries a stale selection across (UX fix,
    /// Phase 5 — Apple HIG: each mode's filter surface is self-contained).
    ///   • `.lista`     → drops the calendar's day selection + its imposed range
    ///                     (the period chips own the list's date filter; a stale
    ///                     calendar day must not pin the list on a single day).
    ///   • `.calendario`→ drops any period-chip filter + its imposed range
    ///                     (the grid is the date filter in Calendario).
    public func clearFiltersForViewMode(_ mode: EventosViewMode) {
        // Each branch clears the OTHER mode's filter residue against the shared
        // `dateRange*` surface, so a mode switch always lands on a predictable
        // "show all" slate for that mode's filter UI.
        switch mode {
        case .lista:
            // The period chips own Lista's date filter; a stale calendar day must
            // not pin the list on a single day. Clears `selectedDay` AND the range
            // it imposed (the day-tap sets both). Deviation from the literal spec
            // pseudocode (which cleared only `selectedDay`): leaving `dateRange*`
            // pinned to the day would trap the list on that one day with no visible
            // indicator — clearing it matches the `.calendario` branch for symmetry.
            selectedDay = nil
            dateRangeStart = nil
            dateRangeEnd = nil
        case .calendario:
            // The grid is the date filter in Calendario; drop any period-chip
            // filter + the range it imposed so the grid shows the full month.
            periodFilter = nil
            dateRangeStart = nil
            dateRangeEnd = nil
        }
    }

    /// Maps a `Calendar.dateInterval` (half-open `[start, end)`) onto the
    /// INCLUSIVE `dateRange*` semantics `filteredEvents` expects:
    ///   • `dateRangeStart` = the first day (`interval.start`, already 00:00)
    ///   • `dateRangeEnd`   = the last day = `interval.end - 1 day`
    /// (`interval.end` is the exclusive first instant of the NEXT period and is
    /// already at 00:00, so subtracting one day yields the last day at 00:00.)
    private func applyInclusiveDateInterval(_ interval: DateInterval?) {
        guard let interval else {
            dateRangeStart = nil
            dateRangeEnd = nil
            return
        }
        dateRangeStart = interval.start
        dateRangeEnd = Calendar.current.date(byAdding: .day, value: -1, to: interval.end)
    }

    public var filteredEvents: [Event] {
        var result = events

        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }

        // Date range filter
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        if let start = dateRangeStart {
            let startStr = dateFormatter.string(from: Calendar.current.startOfDay(for: start))
            result = result.filter { $0.eventDate >= startStr }
        }
        if let end = dateRangeEnd {
            let nextDay = Calendar.current.date(byAdding: .day, value: 1, to: end) ?? end
            let endStr = dateFormatter.string(from: Calendar.current.startOfDay(for: nextDay))
            result = result.filter { $0.eventDate < endStr }
        }

        if !searchQuery.isEmpty {
            let query = searchQuery.lowercased()
            result = result.filter { event in
                event.serviceType.lowercased().contains(query) ||
                (clientMap[event.clientId]?.name.lowercased().contains(query) == true) ||
                (event.location?.lowercased().contains(query) == true) ||
                (event.city?.lowercased().contains(query) == true)
            }
        }

        return result.sorted(by: comparator)
    }

    /// Comparator driven by `sortField` + `sortAscending`. String fields use
    /// `localizedCaseInsensitiveCompare` for correct Spanish/English sorting
    /// (ñ after n, accent-insensitive).
    private var comparator: (Event, Event) -> Bool {
        let ascending = sortAscending
        switch sortField {
        case .eventDate:
            return { lhs, rhs in
                ascending ? lhs.eventDate < rhs.eventDate : lhs.eventDate > rhs.eventDate
            }
        case .serviceType:
            return { lhs, rhs in
                let result = lhs.serviceType.localizedCaseInsensitiveCompare(rhs.serviceType)
                return ascending ? result == .orderedAscending : result == .orderedDescending
            }
        case .clientName:
            let map = clientMap
            return { lhs, rhs in
                let lhsName = map[lhs.clientId]?.name ?? ""
                let rhsName = map[rhs.clientId]?.name ?? ""
                let result = lhsName.localizedCaseInsensitiveCompare(rhsName)
                return ascending ? result == .orderedAscending : result == .orderedDescending
            }
        case .totalAmount:
            return { lhs, rhs in
                ascending ? lhs.totalAmount < rhs.totalAmount : lhs.totalAmount > rhs.totalAmount
            }
        }
    }

    /// Apply sort. If the same field is re-selected, flip the direction —
    /// matches Web's sortable-column behavior. A fresh field resets to the
    /// field's natural default (DESC for numeric/date, ASC for strings).
    public func applySort(_ field: EventSortField) {
        if sortField == field {
            sortAscending.toggle()
        } else {
            sortField = field
            sortAscending = (field == .serviceType || field == .clientName)
        }
    }

    // MARK: - Data Loading

    /// Build query params for the search endpoint. Returns nil when no filters are active.
    private var searchParams: [String: String]? {
        let hasFilters = selectedStatus != nil || dateRangeStart != nil || dateRangeEnd != nil || !searchQuery.isEmpty
        guard hasFilters else { return nil }

        var params: [String: String] = [:]
        if !searchQuery.isEmpty {
            params["q"] = searchQuery
        }
        if let status = selectedStatus {
            params["status"] = status.rawValue
        }
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        if let start = dateRangeStart {
            params["from"] = dateFormatter.string(from: Calendar.current.startOfDay(for: start))
        }
        if let end = dateRangeEnd {
            let nextDay = Calendar.current.date(byAdding: .day, value: 1, to: end) ?? end
            params["to"] = dateFormatter.string(from: Calendar.current.startOfDay(for: nextDay))
        }
        return params
    }

    @MainActor
    public func loadEvents() async {
        isLoading = true
        errorMessage = nil

        // Show cached data immediately while fetching
        if events.isEmpty, let cached = try? cacheManager?.getCachedEvents(maxAge: cacheMaxAge), !cached.isEmpty {
            events = cached
            isShowingCachedData = true
        }

        do {
            // When filters are active, fetch from search endpoint instead of full list
            if let params = searchParams {
                let searchResults: [Event] = try await apiClient.get(Endpoint.eventsSearch, params: params)
                events = searchResults
            } else {
                async let eventsResult: [Event] = apiClient.getAll(Endpoint.events)
                async let clientsResult: [Client] = apiClient.getAll(Endpoint.clients)
                events = try await eventsResult
                clients = try await clientsResult
            }
            isShowingCachedData = false

            // Update cache with fresh data
            try? cacheManager?.cacheEvents(events)
        } catch {
            if events.isEmpty, let cached = try? cacheManager?.getCachedEvents(maxAge: cacheMaxAge), !cached.isEmpty {
                events = cached
                isShowingCachedData = true
            } else {
                errorMessage = tr("events.list.error.load_failed", "Error cargando eventos")
            }
        }
        isLoading = false
    }

    @MainActor
    public func refresh() async {
        await loadEvents()
    }

    // MARK: - Delete

    @MainActor
    public func softDeleteEvent(_ event: Event) -> (event: Event, index: Int)? {
        guard let index = events.firstIndex(where: { $0.id == event.id }) else { return nil }
        let removed = events.remove(at: index)
        return (removed, index)
    }

    @MainActor
    public func restoreEvent(_ event: Event, at index: Int) {
        let safeIndex = min(index, events.count)
        events.insert(event, at: safeIndex)
    }

    @MainActor
    public func confirmDeleteEvent(_ event: Event) async {
        do {
            // Route through the repository (ADR-2): the delete + system-mirror
            // cleanup + identity clearing fan out from this single boundary.
            try await eventRepository.delete(event.id)
        } catch {
            events.append(event)
            errorMessage = tr("events.list.error.delete_failed", "Error al eliminar el evento")
        }
    }

    // MARK: - Status Change

    /// Change an event's status via `PUT /events/{id}`. The row shows an
    /// inline spinner via `updatingStatusEventId` while the request is in
    /// flight. On success we patch the local events array so the badge
    /// updates without a full refetch. Parity with Web's inline status
    /// dropdown and Android's long-press bottom sheet action.
    @MainActor
    public func updateEventStatus(_ event: Event, to newStatus: EventStatus) async {
        guard event.status != newStatus else { return }
        updatingStatusEventId = event.id
        defer { updatingStatusEventId = nil }
        do {
            // Route through the repository (ADR-2): status change + system-mirror
            // update fan out from this single boundary; the returned event
            // patches the local row so the badge updates without a refetch.
            let updated = try await eventRepository.changeStatus(event.id, to: newStatus)
            if let index = events.firstIndex(where: { $0.id == event.id }) {
                events[index] = updated
            }
        } catch {
            errorMessage = tr("events.list.error.status_change_failed", "No se pudo cambiar el estado")
        }
    }

    // MARK: - CSV Export

    public func generateCsvContent() -> String {
        var csv = [
            tr("events.list.csv.header_name", "Nombre"),
            tr("events.list.csv.header_date", "Fecha"),
            tr("events.list.csv.header_client", "Cliente"),
            tr("events.list.csv.header_status", "Estado"),
            tr("events.list.csv.header_total", "Total"),
            tr("events.list.csv.header_people", "Personas"),
            tr("events.list.csv.header_location", "Lugar")
        ].joined(separator: ",") + "\n"
        let statusLabels: [EventStatus: String] = [
            .quoted: tr("events.list.status.quoted", "Cotizado"),
            .confirmed: tr("events.list.status.confirmed", "Confirmado"),
            .completed: tr("events.list.status.completed", "Completado"),
            .cancelled: tr("events.list.status.cancelled", "Cancelado")
        ]
        for event in filteredEvents {
            let name = event.serviceType.escapingCsv
            let date = String(event.eventDate.prefix(10)).escapingCsv
            let client = clientName(for: event.clientId).escapingCsv
            let status = (statusLabels[event.status] ?? event.status.rawValue).escapingCsv
            let total = event.totalAmount.asMXN.escapingCsv
            let people = "\(event.numPeople)"
            let location = (event.location ?? "").escapingCsv
            csv += "\(name),\(date),\(client),\(status),\(total),\(people),\(location)\n"
        }
        return csv
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }
}

// MARK: - CSV String Escaping

private extension String {
    var escapingCsv: String {
        if contains(",") || contains("\"") || contains("\n") {
            return "\"\(replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return self
    }
}
