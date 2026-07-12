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
// `internal` (not private) so the app test target can lock the literals via
// `@testable import Solennix` (cross-target key-parity, REQ-WDS-09).
enum WidgetKey {
    static let upcomingEvents = "widget_upcoming_events"
    static let kpis           = "widget_kpis"
    static let lastUpdated    = "widget_last_updated"
    static let userPlan       = "widget_user_plan"
    static let completedEvents = "completed_events"
    /// Auth-state signal (mirrors `WidgetDataKey.authState` in the widget
    /// extension). Written here so the extension can distinguish signed-out
    /// from empty data.
    static let authState      = "widget_auth_state"
    /// Currency code signal (mirrors `WidgetDataKey.currencyCode`). Written
    /// from `User.defaultCurrency` so widgets format amounts in the user's
    /// currency instead of a hardcoded MXN (#808).
    static let currencyCode   = "widget_currency_code"
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

    // MARK: - Sync Currency Code

    /// Writes the user's preferred currency code (`User.defaultCurrency`) so the
    /// widget extension formats amounts in the user's currency instead of a
    /// hardcoded MXN. Pass `nil`/empty to fall back to the widget default.
    func syncCurrencyCode(_ currencyCode: String?) {
        if let currencyCode, !currencyCode.isEmpty {
            appGroup.set(currencyCode, forKey: WidgetKey.currencyCode)
        } else {
            appGroup.removeObject(forKey: WidgetKey.currencyCode)
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

    // MARK: - Auth State

    /// Writes the auth-state signal the widget extension reads via
    /// `WidgetAuthState.current`. Call `.authenticated` on login and
    /// `.signedOut` on logout (before `clearWidgetData()`). The extension uses
    /// this to distinguish a signed-out user from an authenticated user whose
    /// data has not loaded yet.
    func setAuthState(_ state: WidgetAuthState) {
        appGroup.set(state.rawValue, forKey: WidgetKey.authState)
        appGroup.synchronize()
    }

    // MARK: - Clear Widget Data

    func clearWidgetData() {
        appGroup.removeObject(forKey: WidgetKey.upcomingEvents)
        appGroup.removeObject(forKey: WidgetKey.kpis)
        appGroup.removeObject(forKey: WidgetKey.userPlan)
        appGroup.removeObject(forKey: WidgetKey.lastUpdated)
        appGroup.removeObject(forKey: WidgetKey.completedEvents)
        appGroup.removeObject(forKey: WidgetKey.currencyCode)
        // Intentionally NOT removing `authState`: callers write `.signedOut`
        // before clearing data keys so the extension keeps rendering the
        // signed-out state (rather than defaulting back through an absent key).
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

    /// Create from Event model with client name.
    ///
    /// The widget renders `eventDate` via `Calendar.current`
    /// (`WidgetModels.formattedDate`), so the server-day string MUST be parsed
    /// as LOCAL midnight, not UTC — see `Date.fromServerDayLocal` (whose doc
    /// comment contrasts the UTC `fromServerDay` used by the in-app surfaces).
    /// Using the shared helper keeps the widget and `deriveKPIs` from drifting
    /// apart again (the root cause of #714).
    static func from(event: Event, clientName: String) -> WidgetEventData {
        let eventDate = Date.fromServerDayLocal(event.eventDate) ?? Date()

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
    /// Optional trend seam (decision #3134). `nil` ships a neutral render;
    /// a future backend trend wires here with no UI churn.
    let revenueTrend: WidgetTrend?

    /// Create from dashboard data
    static func from(
        monthlyRevenue: Double,
        eventsThisMonth: Int,
        eventsThisWeek: Int,
        lowStockCount: Int,
        pendingPayments: Double,
        confirmedEvents: Int,
        quotedEvents: Int,
        revenueTrend: WidgetTrend? = nil
    ) -> WidgetKPIData {
        WidgetKPIData(
            monthlyRevenue: monthlyRevenue,
            eventsThisMonth: eventsThisMonth,
            eventsThisWeek: eventsThisWeek,
            lowStockCount: lowStockCount,
            pendingPayments: pendingPayments,
            confirmedEvents: confirmedEvents,
            quotedEvents: quotedEvents,
            revenueTrend: revenueTrend
        )
    }
}

// MARK: - Widget Syncing Protocol

/// Concrete contract for syncing app data to the widget extension.
///
/// `WidgetSyncCoordinator` holds a `WidgetSyncing` (injectable, defaults to
/// `WidgetDataSync.shared`) so the coordinator can be unit-tested with a mock
/// without touching the App Group container or WidgetKit.
///
/// Replaces the dead, never-adopted `WidgetSyncable` protocol.
/// Amends spec REQ-WDS-05.
@MainActor
protocol WidgetSyncing: AnyObject {
    func syncUpcomingEvents(_ events: [WidgetEventData])
    func syncKPIs(_ kpis: WidgetKPIData)
    func syncUserPlan(_ planRawValue: String?)
    func syncCurrencyCode(_ currencyCode: String?)
    func setAuthState(_ state: WidgetAuthState)
    func clearWidgetData()
    func reloadEventWidgets()
    func reloadKPIWidgets()
}

// WidgetDataSync already implements every method of `WidgetSyncing`.
extension WidgetDataSync: WidgetSyncing {}
