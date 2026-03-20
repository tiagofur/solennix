import WidgetKit
import SwiftUI

// MARK: - Widget Bundle

@main
struct SolennixWidgets: WidgetBundle {
    var body: some Widget {
        UpcomingEventsWidget()
        KPIWidget()
        LockScreenWidget()
        InteractiveEventWidget()
        SolennixLiveActivity()
    }
}

// MARK: - App Group Constants

enum AppGroup {
    static let identifier = "group.com.solennix.app"

    static var userDefaults: UserDefaults? {
        UserDefaults(suiteName: identifier)
    }
}

// MARK: - Shared Data Keys

enum WidgetDataKey {
    static let upcomingEvents = "widget_upcoming_events"
    static let kpis = "widget_kpis"
    static let lastUpdated = "widget_last_updated"
}
