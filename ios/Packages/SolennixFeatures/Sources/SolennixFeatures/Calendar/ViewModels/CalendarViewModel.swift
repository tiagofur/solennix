import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Supporting Types

/// Represents a single day cell in the calendar grid.
public struct DateDay: Identifiable, Hashable {
    public let id = UUID()
    public let date: Date
    public let dayNumber: Int
    public let isCurrentMonth: Bool
    public let isToday: Bool
    public let isSelected: Bool
}

/// Typed error surface for the Calendar screen. The view maps each case
/// to a localized string from `Localizable.xcstrings` — translations live
/// in the resource catalog, not in the ViewModel.
public enum CalendarError: Sendable, Equatable {
    case loadFailed
    case blockFailed
    case unblockFailed
}

// MARK: - Calendar View Model

@Observable
public final class CalendarViewModel {

    // MARK: - Properties

    public var currentMonth: Date
    public var events: [Event] = []
    public var unavailableDates: [UnavailableDate] = []
    public var selectedDate: Date?
    public var isLoading: Bool = false
    public var isBlockingDate: Bool = false
    /// Typed last error — the view observes this and renders a localized
    /// banner/alert. Previously this was a free-text Spanish string which
    /// made translation impossible.
    public var error: CalendarError?
    /// null = no filter ("Todos"). Filters both the grid dots and the
    /// selected-day list to events matching the chosen status.
    public var statusFilter: EventStatus?

    /// Map of client ID -> Client for resolving client names.
    public var clientMap: [String: Client] = [:]

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let calendar = Calendar.current

    // MARK: - Date Formatters

    // Month title and selected-date label. `autoupdatingCurrent` makes
    // them follow the device language (es → "marzo 2026", en → "March
    // 2026"). Previously hardcoded `es_MX`, which prevented EN users from
    // ever seeing English month names.
    private static let monthFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale.autoupdatingCurrent
        f.setLocalizedDateFormatFromTemplate("MMMM yyyy")
        return f
    }()

    private static let selectedDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale.autoupdatingCurrent
        f.setLocalizedDateFormatFromTemplate("EEEEdMMMM")
        return f
    }()

    private static let apiDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
        let now = Date()
        let components = Calendar.current.dateComponents([.year, .month], from: now)
        self.currentMonth = Calendar.current.date(from: components) ?? now
    }

    // MARK: - Computed Properties

    /// Events matching the selected date, sorted by start time. Honors
    /// the active `statusFilter` so the day list stays in sync with the
    /// filter chips.
    public var eventsForSelectedDate: [Event] {
        guard let selected = selectedDate else { return [] }
        let selectedStr = Self.apiDateFormatter.string(from: selected)
        return events
            .filter { $0.eventDate == selectedStr }
            .filter { statusFilter == nil || $0.status == statusFilter }
            .sorted { ($0.startTime ?? "") < ($1.startTime ?? "") }
    }

    /// Total number of events on a given day — used to render the `+N más`
    /// overflow badge when there are more than 3 dots worth of data.
    public func eventCountForDay(_ date: Date) -> Int {
        let dateStr = Self.apiDateFormatter.string(from: date)
        return events
            .filter { $0.eventDate == dateStr }
            .filter { statusFilter == nil || $0.status == statusFilter }
            .count
    }

    /// Array of `DateDay` structs for the current month grid, with leading
    /// empty slots so the first day aligns to the correct weekday column.
    public var daysInMonth: [DateDay] {
        let components = calendar.dateComponents([.year, .month], from: currentMonth)
        guard let firstOfMonth = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth)
        else { return [] }

        let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
        let leadingBlanks = firstWeekday - 1

        let today = Date()
        let todayComponents = calendar.dateComponents([.year, .month, .day], from: today)
        let selectedComponents: DateComponents? = selectedDate.map {
            calendar.dateComponents([.year, .month, .day], from: $0)
        }

        var days: [DateDay] = []

        if leadingBlanks > 0 {
            guard let lastDayPrev = calendar.date(byAdding: .day, value: -1, to: firstOfMonth) else {
                return []
            }
            guard let prevMonthRange = calendar.range(of: .day, in: .month, for: lastDayPrev) else {
                return []
            }
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

    /// Up to 3 status-colored dots for a given day, representing events on
    /// that date. Honors `statusFilter` when set. Each dot represents ONE UNIQUE STATUS
    /// (not one event), so if there are 5 confirmed events today → still shows only 1 blue dot.
    public func eventDotsForDay(_ date: Date) -> [EventStatus] {
        let dateStr = Self.apiDateFormatter.string(from: date)
        let dayEvents = events
            .filter { $0.eventDate == dateStr }
            .filter { statusFilter == nil || $0.status == statusFilter }
        
        /// BEFORE (BUGGY): counted first 3 events regardless of status duplication
        /// AFTER: collects unique statuses → render up to 3 dots (each dot = 1 unique status)
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

    /// CORREGIDO BUG OVERFLOW — Returns how many events are NOT rendered as dots.
    /// Formula: totalEvents - min(uniqueStatusesCount, 3)
    /// Examples:
    ///   • 5 eventos × "confirmado" → 1 dot azul → overflow = 4
    ///   • 2 confirmados + 3 cotizados = 2 dots (azul + gris) → overflow = 0
    ///   • 1 confirmado + 1 cancelado = 2 dots → overflow = 0
    public func eventOverflowForDay(_ date: Date) -> Int {
        let dateStr = Self.apiDateFormatter.string(from: date)
        guard !events.isEmpty else { return 0 }
        
        let dayEvents = events.filter { $0.eventDate == dateStr }
            .filter { statusFilter == nil || $0.status == statusFilter }
        let uniqueStatusCount = Set(dayEvents.map { $0.status }).count
        
        /// BEFORE (WRONG): return max(0, eventCountForDay(date) - 3)
        /// — restaba 3 fijos incluso si solo se renderizaron 1-2 dots (<3 eventos únicos)
        
        return max(0, dayEvents.count - Swift.min(uniqueStatusCount, 3))
    }

    /// Formatted month title, e.g. "Marzo 2026".
    public var monthTitle: String {
        Self.monthFormatter.string(from: currentMonth).capitalized
    }

    /// Resolve client name from the client map. Falls back to the
    /// localized "Cliente"/"Client" label when the client is unknown.
    public func clientName(for clientId: String) -> String {
        clientMap[clientId]?.name
            ?? String(localized: "calendar.unknown_client", defaultValue: "Cliente", bundle: .module)
    }

    public func setStatusFilter(_ filter: EventStatus?) {
        statusFilter = filter
    }

    public func clearError() {
        error = nil
    }

    /// Format the selected date for display, e.g. "lunes, 17 de marzo".
    public func formattedSelectedDate() -> String {
        guard let date = selectedDate else { return "" }
        return Self.selectedDateFormatter.string(from: date)
    }

    /// Format a time string like "14:00:00" to "14:00".
    public func formattedTime(_ time: String?) -> String? {
        guard let time else { return nil }
        let parts = time.split(separator: ":")
        guard parts.count >= 2 else { return time }
        return "\(parts[0]):\(parts[1])"
    }

    /// Build a time range string from start_time and end_time.
    public func timeRange(for event: Event) -> String? {
        guard let start = formattedTime(event.startTime) else { return nil }
        if let end = formattedTime(event.endTime) {
            return "\(start) - \(end)"
        }
        return start
    }

    // MARK: - Actions

    public func previousMonth() {
        if let newMonth = calendar.date(byAdding: .month, value: -1, to: currentMonth) {
            currentMonth = newMonth
        }
    }

    public func nextMonth() {
        if let newMonth = calendar.date(byAdding: .month, value: 1, to: currentMonth) {
            currentMonth = newMonth
        }
    }

    public func goToToday() {
        let now = Date()
        let components = calendar.dateComponents([.year, .month], from: now)
        currentMonth = calendar.date(from: components) ?? now
        selectedDate = now
    }

    public func selectDate(_ date: Date) {
        selectedDate = date
    }

    // MARK: - Unavailable Dates

    public func isDateBlocked(_ date: Date) -> Bool {
        let dateStr = Self.apiDateFormatter.string(from: date)
        return unavailableDates.contains { $0.startDate <= dateStr && dateStr <= $0.endDate }
    }

    public func unavailableDateFor(_ date: Date) -> UnavailableDate? {
        let dateStr = Self.apiDateFormatter.string(from: date)
        return unavailableDates.first { $0.startDate <= dateStr && dateStr <= $0.endDate }
    }

    /// Block a date range, or unblock if it is already blocked.
    @MainActor
    public func toggleDateBlock(startDate: Date, endDate: Date, reason: String?) async {
        isBlockingDate = true
        let wasBlocked = unavailableDateFor(startDate) != nil
        do {
            if let existing = unavailableDateFor(startDate) {
                try await apiClient.delete(Endpoint.unavailableDate(existing.id))
            } else {
                let startStr = Self.apiDateFormatter.string(from: startDate)
                let endStr = Self.apiDateFormatter.string(from: endDate)
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
            self.error = wasBlocked ? .unblockFailed : .blockFailed
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
            self.error = .unblockFailed
        }
        isBlockingDate = false
    }

    @MainActor
    public func loadUnavailableDates() async {
        let now = Date()
        guard let startDate = calendar.date(byAdding: .month, value: -6, to: now),
              let endDate = calendar.date(byAdding: .month, value: 6, to: now)
        else { return }

        let startStr = Self.apiDateFormatter.string(from: startDate)
        let endStr = Self.apiDateFormatter.string(from: endDate)

        do {
            let fetched: [UnavailableDate] = try await apiClient.getAll(
                Endpoint.unavailableDates,
                params: ["start": startStr, "end": endStr]
            )
            unavailableDates = fetched
        } catch {
            // Surface through the typed error channel instead of silently
            // failing — before, a server outage left stale blocked dates
            // on screen with no user indication.
            self.error = .loadFailed
        }
    }

    // MARK: - Data Loading

    @MainActor
    public func loadEvents() async {
        isLoading = true
        error = nil

        do {
            let now = Date()
            guard let startDate = calendar.date(byAdding: .month, value: -6, to: now),
                  let endDate = calendar.date(byAdding: .month, value: 6, to: now)
            else {
                self.error = .loadFailed
                isLoading = false
                return
            }

            let startStr = Self.apiDateFormatter.string(from: startDate)
            let endStr = Self.apiDateFormatter.string(from: endDate)

            async let eventsResult: [Event] = apiClient.getAll(
                Endpoint.events,
                params: ["start_date": startStr, "end_date": endStr]
            )
            async let clientsResult: [Client] = apiClient.getAll(Endpoint.clients)
            async let unavailableResult: [UnavailableDate] = apiClient.getAll(
                Endpoint.unavailableDates,
                params: ["start": startStr, "end": endStr]
            )

            let fetchedEvents = try await eventsResult
            let fetchedClients = try await clientsResult
            let fetchedUnavailable = try await unavailableResult

            events = fetchedEvents
            clientMap = Dictionary(uniqueKeysWithValues: fetchedClients.map { ($0.id, $0) })
            unavailableDates = fetchedUnavailable

        } catch {
            self.error = .loadFailed
        }

        isLoading = false
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension CalendarViewModel {
    static var preview: CalendarViewModel {
        let vm = CalendarViewModel(apiClient: APIClient())
        vm.events = [
            Event(
                id: "1",
                userId: "u1",
                clientId: "c1",
                eventDate: "2026-03-17",
                startTime: "14:00:00",
                endTime: "18:00:00",
                serviceType: "Banquete",
                numPeople: 150,
                status: .confirmed,
                discount: 0,
                discountType: .percent,
                requiresInvoice: false,
                taxRate: 16,
                taxAmount: 4800,
                totalAmount: 34800,
                location: "Jardin Los Pinos",
                createdAt: "2026-03-01",
                updatedAt: "2026-03-01"
            ),
            Event(
                id: "2",
                userId: "u1",
                clientId: "c2",
                eventDate: "2026-03-17",
                startTime: "10:00:00",
                endTime: "13:00:00",
                serviceType: "Coffee Break",
                numPeople: 30,
                status: .quoted,
                discount: 10,
                discountType: .percent,
                requiresInvoice: true,
                taxRate: 16,
                taxAmount: 800,
                totalAmount: 5800,
                createdAt: "2026-03-05",
                updatedAt: "2026-03-05"
            ),
            Event(
                id: "3",
                userId: "u1",
                clientId: "c1",
                eventDate: "2026-03-22",
                serviceType: "Coctel",
                numPeople: 80,
                status: .completed,
                discount: 0,
                discountType: .fixed,
                requiresInvoice: false,
                taxRate: 16,
                taxAmount: 2400,
                totalAmount: 17400,
                location: "Salon Dorado",
                createdAt: "2026-02-15",
                updatedAt: "2026-03-22"
            ),
        ]
        vm.clientMap = [
            "c1": Client(
                id: "c1", userId: "u1", name: "Maria Lopez", phone: "5551234567",
                createdAt: "2026-01-01", updatedAt: "2026-01-01"
            ),
            "c2": Client(
                id: "c2", userId: "u1", name: "Carlos Rivera", phone: "5559876543",
                createdAt: "2026-01-01", updatedAt: "2026-01-01"
            ),
        ]
        vm.selectedDate = Date()
        return vm
    }
}
#endif
