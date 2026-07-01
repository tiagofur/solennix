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
