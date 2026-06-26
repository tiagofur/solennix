import XCTest
import Foundation
import SolennixCore

final class RouteCoreTests: XCTestCase {

    func testEventFormDefaultAssociatedValues() {
        XCTAssertEqual(Route.eventForm(), Route.eventForm(id: nil, clientId: nil, date: nil))
    }

    func testSearchDefaultQuery() {
        XCTAssertEqual(Route.search(), Route.search(query: ""))
    }

    func testRoutesWithDifferentIDsAreNotEqual() {
        XCTAssertNotEqual(Route.eventDetail(id: "evt-1"), Route.eventDetail(id: "evt-2"))
        XCTAssertNotEqual(Route.clientDetail(id: "cli-1"), Route.clientDetail(id: "cli-2"))
        XCTAssertNotEqual(Route.productDetail(id: "prd-1"), Route.productDetail(id: "prd-2"))
    }

    func testEventFormRoutesDifferByPayload() {
        let date = Date(timeIntervalSince1970: 1000)
        XCTAssertNotEqual(Route.eventForm(id: "evt-1"), Route.eventForm(id: "evt-2"))
        XCTAssertNotEqual(Route.eventForm(clientId: "cli-1"), Route.eventForm(clientId: "cli-2"))
        XCTAssertNotEqual(Route.eventForm(date: date), Route.eventForm(date: date.addingTimeInterval(60)))
    }

    func testEventFormDefaultStepIsNil() {
        XCTAssertEqual(Route.eventForm(id: "evt-1"), Route.eventForm(id: "evt-1", step: nil))
    }

    func testEventFormStepDifferentValuesAreNotEqual() {
        XCTAssertNotEqual(Route.eventForm(id: "evt-1", step: 1), Route.eventForm(id: "evt-1", step: 2))
        XCTAssertNotEqual(Route.eventForm(id: "evt-1", step: nil), Route.eventForm(id: "evt-1", step: 1))
    }

    func testHashableAllowsDistinctRoutesInSet() {
        let routes: Set<Route> = [
            .eventList,
            .eventDetail(id: "evt-1"),
            .eventDetail(id: "evt-2"),
            .settings,
            .search(query: "ana"),
            .search(query: "ana")
        ]

        XCTAssertEqual(routes.count, 5)
        XCTAssertTrue(routes.contains(.eventList))
        XCTAssertTrue(routes.contains(.eventDetail(id: "evt-1")))
        XCTAssertTrue(routes.contains(.eventDetail(id: "evt-2")))
        XCTAssertTrue(routes.contains(.settings))
        XCTAssertTrue(routes.contains(.search(query: "ana")))
    }

    func testDifferentRouteFamiliesAreNotEqualEvenWithSameID() {
        let id = "same-id"
        XCTAssertNotEqual(Route.eventDetail(id: id), Route.clientDetail(id: id))
        XCTAssertNotEqual(Route.clientDetail(id: id), Route.productDetail(id: id))
        XCTAssertNotEqual(Route.inventoryDetail(id: id), Route.staffDetail(id: id))
    }

    // MARK: - Calendar Sync Preferences route (unify-events-calendar-ios, task 5.3)

    func testCalendarSyncPreferencesRouteExistsAndIsHashable() {
        // The Settings → calendar-sync entry MUST resolve to a dedicated Route
        // case so NavigationPath/.navigationDestination can push it (spec:
        // "Route.calendarSyncPreferences MUST exist").
        XCTAssertEqual(Route.calendarSyncPreferences, Route.calendarSyncPreferences)

        let routes: Set<Route> = [.calendarSyncPreferences, .notificationPreferences, .settings]
        XCTAssertEqual(routes.count, 3)
        XCTAssertTrue(routes.contains(.calendarSyncPreferences))
    }

    func testCalendarSyncPreferencesIsDistinctFromOtherSettingsRoutes() {
        // Triangulation: it MUST NOT collide with the neighboring Settings routes.
        XCTAssertNotEqual(Route.calendarSyncPreferences, Route.notificationPreferences)
        XCTAssertNotEqual(Route.calendarSyncPreferences, Route.settings)
    }
}
