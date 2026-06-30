import Foundation
import WidgetKit
import os.log
import SolennixCore
import SolennixFeatures

private let logger = Logger(subsystem: "com.solennix.app", category: "WidgetDataSync")

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

    private let appGroup: UserDefaults = {
        guard let suite = UserDefaults(suiteName: "group.com.solennix.app") else {
            fatalError("App Group 'group.com.solennix.app' not configured. Enable it in Signing & Capabilities.")
        }
        return suite
    }()

    private init() {}

    // MARK: - Sync Upcoming Events

    func syncUpcomingEvents(_ events: [WidgetEventData]) {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(events)
            appGroup.set(data, forKey: WidgetKey.upcomingEvents)
            appGroup.set(Date(), forKey: WidgetKey.lastUpdated)
            appGroup.synchronize()

            // Reload widgets
            reloadEventWidgets()
        } catch {
            logger.error("Failed to sync events to widget: \(error.localizedDescription, privacy: .public)")
            SentryHelper.capture(error: error, context: "widget_sync_events")
        }
    }

    // MARK: - Sync KPIs

    func syncKPIs(_ kpis: WidgetKPIData) {
        do {
            let data = try JSONEncoder().encode(kpis)
            appGroup.set(data, forKey: WidgetKey.kpis)
            appGroup.synchronize()

            // Reload widgets
            reloadKPIWidgets()
        } catch {
            logger.error("Failed to sync KPIs to widget: \(error.localizedDescription, privacy: .public)")
            SentryHelper.capture(error: error, context: "widget_sync_kpis")
        }
    }

    // MARK: - Sync User Plan

    func syncUserPlan(_ planRawValue: String?) {
        if let planRawValue, !planRawValue.isEmpty {
            appGroup.set(planRawValue, forKey: WidgetKey.userPlan)
        } else {
            appGroup.removeObject(forKey: WidgetKey.userPlan)
        }
        appGroup.synchronize()
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
        appGroup.removeObject(forKey: WidgetKey.upcomingEvents)
        appGroup.removeObject(forKey: WidgetKey.kpis)
        appGroup.removeObject(forKey: WidgetKey.userPlan)
        appGroup.removeObject(forKey: WidgetKey.lastUpdated)
        appGroup.removeObject(forKey: WidgetKey.completedEvents)
        appGroup.synchronize()
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
