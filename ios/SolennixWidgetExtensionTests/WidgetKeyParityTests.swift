import XCTest

/// REQ-WDS-09 (W7): lock the widget data-key literals so the extension and the
/// app cannot silently drift. These are `static let String` constants compared
/// directly against their expected values (NOT enum-case `.rawValue`). The app
/// side (`WidgetKey`) is locked in `SolennixTests`; identical literals here +
/// there = cross-target parity, with the codesigned round-trip (PR2) as the
/// end-to-end gate.
final class WidgetKeyParityTests: XCTestCase {

    func testWidgetDataKeyLiteralsAreStable() {
        XCTAssertEqual(WidgetDataKey.upcomingEvents, "widget_upcoming_events")
        XCTAssertEqual(WidgetDataKey.kpis, "widget_kpis")
        XCTAssertEqual(WidgetDataKey.lastUpdated, "widget_last_updated")
        XCTAssertEqual(WidgetDataKey.userPlan, "widget_user_plan")
        XCTAssertEqual(WidgetDataKey.completedEvents, "completed_events")
        XCTAssertEqual(WidgetDataKey.authState, "widget_auth_state")
    }
}
