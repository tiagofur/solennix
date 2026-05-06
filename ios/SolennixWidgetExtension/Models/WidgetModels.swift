import Foundation

// MARK: - Widget Event

/// Simplified event model for widget display
struct WidgetEvent: Codable, Identifiable, Hashable {
    let id: String
    let clientName: String
    let eventType: String
    let eventDate: Date
    let startTime: String?
    let location: String?
    let guestCount: Int?
    let status: String
    let totalAmount: Double?

    var isToday: Bool {
        Calendar.current.isDateInToday(eventDate)
    }

    var isTomorrow: Bool {
        Calendar.current.isDateInTomorrow(eventDate)
    }

    var daysUntil: Int {
        Calendar.current.dateComponents([.day], from: Date(), to: eventDate).day ?? 0
    }

    var formattedDate: String {
        if isToday {
            return "Hoy"
        } else if isTomorrow {
            return "Manana"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "d MMM"
            formatter.locale = Locale(identifier: "es_MX")
            return formatter.string(from: eventDate)
        }
    }

    var statusColor: String {
        switch status {
        case "confirmed": return "success"
        case "quoted": return "warning"
        case "completed": return "secondary"
        case "cancelled": return "error"
        default: return "primary"
        }
    }
}

// MARK: - Widget KPIs

struct WidgetKPIs: Codable {
    let monthlyRevenue: Double
    let eventsThisMonth: Int
    let eventsThisWeek: Int
    let lowStockCount: Int
    let pendingPayments: Double
    let confirmedEvents: Int
    let quotedEvents: Int

    var formattedRevenue: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: monthlyRevenue)) ?? "$0"
    }

    var formattedPendingPayments: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: pendingPayments)) ?? "$0"
    }
}

// MARK: - Widget Data Provider

final class WidgetDataProvider: @unchecked Sendable {

    static let shared = WidgetDataProvider()

    private init() {}

    // MARK: - Read Data

    func getUpcomingEvents() -> [WidgetEvent] {
        guard let data = AppGroup.userDefaults?.data(forKey: WidgetDataKey.upcomingEvents) else {
            return []
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode([WidgetEvent].self, from: data)
        } catch {
            return []
        }
    }

    func getKPIs() -> WidgetKPIs {
        guard let data = AppGroup.userDefaults?.data(forKey: WidgetDataKey.kpis) else {
            return WidgetKPIs(
                monthlyRevenue: 0,
                eventsThisMonth: 0,
                eventsThisWeek: 0,
                lowStockCount: 0,
                pendingPayments: 0,
                confirmedEvents: 0,
                quotedEvents: 0
            )
        }

        do {
            return try JSONDecoder().decode(WidgetKPIs.self, from: data)
        } catch {
            return WidgetKPIs(
                monthlyRevenue: 0,
                eventsThisMonth: 0,
                eventsThisWeek: 0,
                lowStockCount: 0,
                pendingPayments: 0,
                confirmedEvents: 0,
                quotedEvents: 0
            )
        }
    }

    func getLastUpdated() -> Date? {
        AppGroup.userDefaults?.object(forKey: WidgetDataKey.lastUpdated) as? Date
    }

    // MARK: - Write Data (Called from main app)

    func saveUpcomingEvents(_ events: [WidgetEvent]) {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(events)
            AppGroup.userDefaults?.set(data, forKey: WidgetDataKey.upcomingEvents)
            AppGroup.userDefaults?.set(Date(), forKey: WidgetDataKey.lastUpdated)
        } catch {
            print("Failed to save widget events: \(error)")
        }
    }

    func saveKPIs(_ kpis: WidgetKPIs) {
        do {
            let data = try JSONEncoder().encode(kpis)
            AppGroup.userDefaults?.set(data, forKey: WidgetDataKey.kpis)
        } catch {
            print("Failed to save widget KPIs: \(error)")
        }
    }
}
