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

/// Toggle between calendar grid and event list.
public enum ViewMode: String, CaseIterable {
    case calendar = "Calendario"
    case list = "Lista"
}

/// Filter events by status.
public enum StatusFilter: String, CaseIterable {
    case all = "Todos"
    case quoted = "Cotizado"
    case confirmed = "Confirmado"
    case completed = "Completado"
    case cancelled = "Cancelado"

    /// The corresponding `EventStatus`, if any.
    public var eventStatus: EventStatus? {
        switch self {
        case .all: return nil
        case .quoted: return .quoted
        case .confirmed: return .confirmed
        case .completed: return .completed
        case .cancelled: return .cancelled
        }
    }
}

// MARK: - Calendar View Model

@Observable
public final class CalendarViewModel {

    // MARK: - Properties

    public var currentMonth: Date
    public var events: [Event] = []
    public var unavailableDates: [UnavailableDate] = []
    public var selectedDate: Date?
    public var viewMode: ViewMode = .calendar
    public var searchText: String = ""
    public var statusFilter: StatusFilter = .all
    public var isLoading: Bool = false
    public var isBlockingDate: Bool = false
    public var errorMessage: String?

    /// Map of client ID -> Client for resolving client names.
    public var clientMap: [String: Client] = [:]

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let calendar = Calendar.current

    // MARK: - Date Formatters

    private static let monthFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.dateFormat = "MMMM yyyy"
        return f
    }()

    private static let selectedDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.dateFormat = "EEEE, d 'de' MMMM"
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.dateFormat = "HH:mm"
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
        // Start on the current month
        let now = Date()
        let components = Calendar.current.dateComponents([.year, .month], from: now)
        self.currentMonth = Calendar.current.date(from: components) ?? now
    }

    // MARK: - Computed Properties

    /// Count of events grouped by status.
    public var statusCounts: [EventStatus: Int] {
        Dictionary(grouping: events, by: { $0.status }).mapValues { $0.count }
    }

    /// Total number of events (all statuses).
    public var totalEventCount: Int {
        events.count
    }

    /// Events matching the selected date.
    public var eventsForSelectedDate: [Event] {
        guard let selected = selectedDate else { return [] }
        let selectedStr = Self.apiDateFormatter.string(from: selected)
        return events
            .filter { $0.eventDate == selectedStr }
            .sorted { ($0.startTime ?? "") < ($1.startTime ?? "") }
    }

    /// Events filtered by search text and status, sorted by event_date desc.
    public var filteredEvents: [Event] {
        var result = events

        // Status filter
        if let status = statusFilter.eventStatus {
            result = result.filter { $0.status == status }
        }

        // Search filter: client name, service type, location
        if !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let query = searchText.lowercased()
            result = result.filter { event in
                let clientName = clientMap[event.clientId]?.name.lowercased() ?? ""
                return clientName.contains(query)
                    || event.serviceType.lowercased().contains(query)
                    || (event.location?.lowercased().contains(query) ?? false)
            }
        }

        // Sort by event_date descending
        return result.sorted { $0.eventDate > $1.eventDate }
    }

    /// Array of `DateDay` structs for the current month grid, with leading
    /// empty slots so the first day aligns to the correct weekday column.
    public var daysInMonth: [DateDay] {
        let components = calendar.dateComponents([.year, .month], from: currentMonth)
        guard let firstOfMonth = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth)
        else { return [] }

        let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
        // Sunday = 1, so offset = firstWeekday - 1 (0-based, Sunday-start)
        let leadingBlanks = firstWeekday - 1

        let today = Date()
        let todayComponents = calendar.dateComponents([.year, .month, .day], from: today)
        let selectedComponents: DateComponents? = selectedDate.map {
            calendar.dateComponents([.year, .month, .day], from: $0)
        }

        var days: [DateDay] = []

        // Leading blank days (from previous month)
        if leadingBlanks > 0 {
            guard let lastDayPrev = calendar.date(byAdding: .day, value: -1, to: firstOfMonth) else {
                return []
            }
            let prevMonthRange = calendar.range(of: .day, in: .month, for: lastDayPrev)!
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

        // Current month days
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

    /// Up to 3 status-colored dots for a given day, representing events on that date.
    public func eventDotsForDay(_ date: Date) -> [EventStatus] {
        let dateStr = Self.apiDateFormatter.string(from: date)
        let dayEvents = events.filter { $0.eventDate == dateStr }
        // Return unique statuses, up to 3
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

    /// Formatted month title, e.g. "Marzo 2026".
    public var monthTitle: String {
        Self.monthFormatter.string(from: currentMonth).capitalized
    }

    /// Resolve client name from the client map.
    public func clientName(for clientId: String) -> String {
        clientMap[clientId]?.name ?? "Cliente"
    }

    /// Format the selected date for display, e.g. "lunes, 17 de marzo".
    public func formattedSelectedDate() -> String {
        guard let date = selectedDate else { return "" }
        return Self.selectedDateFormatter.string(from: date)
    }

    /// Format a time string like "14:00:00" to "14:00".
    public func formattedTime(_ time: String?) -> String? {
        guard let time else { return nil }
        // Time comes as "HH:mm:ss" or "HH:mm" from the API
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

    /// Navigate to the previous month.
    public func previousMonth() {
        if let newMonth = calendar.date(byAdding: .month, value: -1, to: currentMonth) {
            currentMonth = newMonth
        }
    }

    /// Navigate to the next month.
    public func nextMonth() {
        if let newMonth = calendar.date(byAdding: .month, value: 1, to: currentMonth) {
            currentMonth = newMonth
        }
    }

    /// Jump to today's month and select today.
    public func goToToday() {
        let now = Date()
        let components = calendar.dateComponents([.year, .month], from: now)
        currentMonth = calendar.date(from: components) ?? now
        selectedDate = now
    }

    /// Select a specific date.
    public func selectDate(_ date: Date) {
        selectedDate = date
    }

    // MARK: - Unavailable Dates

    /// Check if a date falls within any unavailable date range.
    public func isDateBlocked(_ date: Date) -> Bool {
        let dateStr = Self.apiDateFormatter.string(from: date)
        return unavailableDates.contains { $0.startDate <= dateStr && dateStr <= $0.endDate }
    }

    /// Return the `UnavailableDate` that covers this date, if any.
    public func unavailableDateFor(_ date: Date) -> UnavailableDate? {
        let dateStr = Self.apiDateFormatter.string(from: date)
        return unavailableDates.first { $0.startDate <= dateStr && dateStr <= $0.endDate }
    }

    /// Toggle the blocked state of a date. If blocked, unblock it; if not, block it.
    @MainActor
    public func toggleDateBlock(date: Date, reason: String?) async {
        isBlockingDate = true
        do {
            if let existing = unavailableDateFor(date) {
                // Unblock: DELETE the unavailable date
                try await apiClient.delete(Endpoint.unavailableDate(existing.id))
            } else {
                // Block: POST a new unavailable date
                let dateStr = Self.apiDateFormatter.string(from: date)
                struct BlockRequest: Encodable {
                    let startDate: String
                    let endDate: String
                    let reason: String?

                    enum CodingKeys: String, CodingKey {
                        case startDate = "start_date"
                        case endDate = "end_date"
                        case reason
                    }
                }
                let body = BlockRequest(startDate: dateStr, endDate: dateStr, reason: reason)
                let _: UnavailableDate = try await apiClient.post(Endpoint.unavailableDates, body: body)
            }
            // Reload unavailable dates
            await loadUnavailableDates()
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Error actualizando fecha"
            } else {
                errorMessage = "Error actualizando fecha"
            }
        }
        isBlockingDate = false
    }

    /// Load unavailable dates for the visible range.
    @MainActor
    public func loadUnavailableDates() async {
        let now = Date()
        guard let startDate = calendar.date(byAdding: .month, value: -6, to: now),
              let endDate = calendar.date(byAdding: .month, value: 6, to: now)
        else { return }

        let startStr = Self.apiDateFormatter.string(from: startDate)
        let endStr = Self.apiDateFormatter.string(from: endDate)

        do {
            let fetched: [UnavailableDate] = try await apiClient.get(
                Endpoint.unavailableDates,
                params: ["start": startStr, "end": endStr]
            )
            unavailableDates = fetched
        } catch {
            // Silently fail — unavailable dates are non-critical
        }
    }

    // MARK: - Data Loading

    /// Load events within a 12-month window (6 months back, 6 months forward)
    /// and the full client list for name resolution.
    @MainActor
    public func loadEvents() async {
        isLoading = true
        errorMessage = nil

        do {
            let now = Date()
            guard let startDate = calendar.date(byAdding: .month, value: -6, to: now),
                  let endDate = calendar.date(byAdding: .month, value: 6, to: now)
            else {
                errorMessage = "Error calculando rango de fechas"
                isLoading = false
                return
            }

            let startStr = Self.apiDateFormatter.string(from: startDate)
            let endStr = Self.apiDateFormatter.string(from: endDate)

            async let eventsResult: [Event] = apiClient.get(
                Endpoint.events,
                params: ["start_date": startStr, "end_date": endStr]
            )
            async let clientsResult: [Client] = apiClient.get(Endpoint.clients)
            async let unavailableResult: [UnavailableDate] = apiClient.get(
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
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Error cargando eventos"
            } else {
                errorMessage = "Error cargando eventos"
            }
        }

        isLoading = false
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension CalendarViewModel {
    /// Create a view model with mock data for previews.
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
