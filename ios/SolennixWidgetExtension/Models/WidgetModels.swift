import Foundation
import os.log
import SolennixCore

private let logger = Logger(subsystem: "com.solennix.app", category: "WidgetModels")

// MARK: - Widget Auth State (extension-side reader)

extension WidgetAuthState {
    /// Reads the auth state from the shared App Group container.
    ///
    /// Defaults to `.signedOut` when the key is absent — a safe pre-login
    /// default so a freshly installed widget renders signed-out and never a
    /// previous user's stale data. The app writes this key on login/logout
    /// (`WidgetDataSync.setAuthState`).
    static var current: WidgetAuthState {
        let raw = AppGroup.userDefaults.string(forKey: WidgetDataKey.authState)
            ?? WidgetAuthState.signedOut.rawValue
        return WidgetAuthState(rawValue: raw) ?? .signedOut
    }
}

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

final class WidgetDataProvider {

    static let shared = WidgetDataProvider()

    private init() {}

    // MARK: - Read Data

    func getUpcomingEvents() -> [WidgetEvent] {
        guard let data = AppGroup.userDefaults.data(forKey: WidgetDataKey.upcomingEvents) else {
            logger.debug("No upcoming events data found in App Group")
            return []
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let events = try decoder.decode([WidgetEvent].self, from: data)
            logger.debug("Successfully decoded \(events.count) upcoming events from App Group")
            return events
        } catch {
            logger.error("Failed to decode upcoming events: \(error.localizedDescription, privacy: .public)")
            return []
        }
    }

    func getKPIs() -> WidgetKPIs {
        guard let data = AppGroup.userDefaults.data(forKey: WidgetDataKey.kpis) else {
            logger.debug("No KPIs data found in App Group, returning zeros")
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
            let kpis = try JSONDecoder().decode(WidgetKPIs.self, from: data)
            logger.debug("Successfully decoded KPIs from App Group: revenue=\(kpis.monthlyRevenue), pending=\(kpis.pendingPayments)")
            return kpis
        } catch {
            logger.error("Failed to decode KPIs: \(error.localizedDescription, privacy: .public)")
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
        AppGroup.userDefaults.object(forKey: WidgetDataKey.lastUpdated) as? Date
    }

    // MARK: - Write Data (Called from main app)

    func saveUpcomingEvents(_ events: [WidgetEvent]) {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(events)
            AppGroup.userDefaults.set(data, forKey: WidgetDataKey.upcomingEvents)
            AppGroup.userDefaults.set(Date(), forKey: WidgetDataKey.lastUpdated)
            AppGroup.userDefaults.synchronize()
        } catch {
            logger.error("Failed to save widget events: \(error.localizedDescription, privacy: .public)")
        }
    }

    func saveKPIs(_ kpis: WidgetKPIs) {
        do {
            let data = try JSONEncoder().encode(kpis)
            AppGroup.userDefaults.set(data, forKey: WidgetDataKey.kpis)
            AppGroup.userDefaults.synchronize()
        } catch {
            logger.error("Failed to save widget KPIs: \(error.localizedDescription, privacy: .public)")
        }
    }
}
