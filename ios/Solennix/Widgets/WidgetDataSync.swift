import Foundation
import WidgetKit
import SolennixCore

// MARK: - Widget Data Key Constants

// Mirror of WidgetDataKey in SolennixWidgetExtension. Both targets share the
// same App Group container, so every key used to write/clear data here MUST
// match the constant used in the widget extension. Add new keys to BOTH enums.
private enum WidgetKey {
    static let upcomingEvents = "widget_upcoming_events"
    static let kpis           = "widget_kpis"
    static let lastUpdated    = "widget_last_updated"
    static let userPlan       = "widget_user_plan"
    static let completedEvents = "completed_events"
}

// MARK: - Widget Data Sync

/// Syncs app data to the widget extension via App Group shared container
@MainActor
final class WidgetDataSync {

    static let shared = WidgetDataSync()

    private let appGroupId = "group.com.solennix.app"

    private var userDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    private init() {}

    // MARK: - Sync Upcoming Events

    func syncUpcomingEvents(_ events: [WidgetEventData]) {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(events)
            userDefaults?.set(data, forKey: WidgetKey.upcomingEvents)
            userDefaults?.set(Date(), forKey: WidgetKey.lastUpdated)

            // Reload widgets
            reloadEventWidgets()
        } catch {
            print("Failed to sync events to widget: \(error)")
        }
    }

    // MARK: - Sync KPIs

    func syncKPIs(_ kpis: WidgetKPIData) {
        do {
            let data = try JSONEncoder().encode(kpis)
            userDefaults?.set(data, forKey: WidgetKey.kpis)

            // Reload widgets
            reloadKPIWidgets()
        } catch {
            print("Failed to sync KPIs to widget: \(error)")
        }
    }

    // MARK: - Sync User Plan

    func syncUserPlan(_ planRawValue: String?) {
        if let planRawValue, !planRawValue.isEmpty {
            userDefaults?.set(planRawValue, forKey: WidgetKey.userPlan)
        } else {
            userDefaults?.removeObject(forKey: WidgetKey.userPlan)
        }
    }

    // MARK: - Reload Widgets

    func reloadEventWidgets() {
        WidgetCenter.shared.reloadTimelines(ofKind: "UpcomingEventsWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "LockScreenWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "InteractiveEventWidget")
    }

    func reloadKPIWidgets() {
        WidgetCenter.shared.reloadTimelines(ofKind: "KPIWidget")
    }

    func reloadAllWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }

    // MARK: - Clear Widget Data

    func clearWidgetData() {
        userDefaults?.removeObject(forKey: WidgetKey.upcomingEvents)
        userDefaults?.removeObject(forKey: WidgetKey.kpis)
        userDefaults?.removeObject(forKey: WidgetKey.userPlan)
        userDefaults?.removeObject(forKey: WidgetKey.lastUpdated)
        userDefaults?.removeObject(forKey: WidgetKey.completedEvents)
        reloadAllWidgets()
    }
}

// MARK: - Widget Data Models

/// Event data model for widget consumption
struct WidgetEventData: Codable, Identifiable {
    let id: String
    let clientName: String
    let eventType: String
    let eventDate: Date
    let startTime: String?
    let location: String?
    let guestCount: Int?
    let status: String
    let totalAmount: Double?

    /// Create from Event model with client name
    static func from(event: Event, clientName: String) -> WidgetEventData {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        let eventDate = formatter.date(from: event.eventDate) ?? Date()

        return WidgetEventData(
            id: event.id,
            clientName: clientName,
            eventType: event.serviceType,
            eventDate: eventDate,
            startTime: event.startTime,
            location: event.location,
            guestCount: event.numPeople,
            status: event.status.rawValue,
            totalAmount: event.totalAmount
        )
    }
}

/// KPI data model for widget consumption
struct WidgetKPIData: Codable {
    let monthlyRevenue: Double
    let eventsThisMonth: Int
    let eventsThisWeek: Int
    let lowStockCount: Int
    let pendingPayments: Double
    let confirmedEvents: Int
    let quotedEvents: Int

    /// Create from dashboard data
    static func from(
        monthlyRevenue: Double,
        eventsThisMonth: Int,
        eventsThisWeek: Int,
        lowStockCount: Int,
        pendingPayments: Double,
        confirmedEvents: Int,
        quotedEvents: Int
    ) -> WidgetKPIData {
        WidgetKPIData(
            monthlyRevenue: monthlyRevenue,
            eventsThisMonth: eventsThisMonth,
            eventsThisWeek: eventsThisWeek,
            lowStockCount: lowStockCount,
            pendingPayments: pendingPayments,
            confirmedEvents: confirmedEvents,
            quotedEvents: quotedEvents
        )
    }
}

// MARK: - Widget Sync Extension for ViewModels

/// Protocol for ViewModels that can sync data to widgets
protocol WidgetSyncable {
    func syncToWidget()
}

// Example usage in DashboardViewModel:
// extension DashboardViewModel: WidgetSyncable {
//     func syncToWidget() {
//         let kpis = WidgetKPIData(
//             monthlyRevenue: self.monthlyRevenue,
//             eventsThisMonth: self.eventsThisMonth,
//             // ... etc
//         )
//         WidgetDataSync.shared.syncKPIs(kpis)
//     }
// }
