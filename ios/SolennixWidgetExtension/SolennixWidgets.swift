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

    static let userDefaults: UserDefaults = {
        guard let suite = UserDefaults(suiteName: identifier) else {
            fatalError("App Group '\(identifier)' not configured in widget extension. Enable it in Signing & Capabilities.")
        }
        return suite
    }()
}

// MARK: - Shared Data Keys

enum WidgetDataKey {
    static let upcomingEvents = "widget_upcoming_events"
    static let kpis = "widget_kpis"
    static let lastUpdated = "widget_last_updated"
    static let userPlan = "widget_user_plan"
    static let completedEvents = "completed_events"
}
