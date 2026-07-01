import XCTest
@testable import Solennix

/// App-side half of the cross-target key-parity lock (REQ-WDS-09 / W7).
/// `WidgetKey` literals must match `WidgetDataKey` (locked in the
/// SolennixWidgetExtensionTests target). Compared directly against the
/// expected strings — NOT via enum `.rawValue`.
final class WidgetKeyParityTests: XCTestCase {

    func testWidgetKeyLiteralsAreStable() {
        XCTAssertEqual(WidgetKey.upcomingEvents, "widget_upcoming_events")
        XCTAssertEqual(WidgetKey.kpis, "widget_kpis")
        XCTAssertEqual(WidgetKey.lastUpdated, "widget_last_updated")
        XCTAssertEqual(WidgetKey.userPlan, "widget_user_plan")
        XCTAssertEqual(WidgetKey.completedEvents, "completed_events")
        XCTAssertEqual(WidgetKey.authState, "widget_auth_state")
    }
}
