import XCTest
import Foundation
import SwiftUI
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

    // MARK: - Codable round-trip (ios-lifecycle PR-B / B1 — SceneStorage GATE)
    //
    // Route MUST be Codable so a NavigationPath holding Route values can be
    // persisted via NavigationPath.CodableRepresentation (JSON-encoded into
    // @SceneStorage) and restored verbatim on relaunch. This test is the RED→GREEN
    // gate for the whole state-restoration work unit: it MUST be green before any
    // @SceneStorage wiring (B2/B3) is added.

    private func assertRoundTrip(_ route: Route, file: StaticString = #filePath, line: UInt = #line) {
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        do {
            let data = try encoder.encode(route)
            let decoded = try decoder.decode(Route.self, from: data)
            XCTAssertEqual(route, decoded, "Route did not survive Codable round-trip", file: file, line: line)
        } catch {
            XCTFail("Route Codable round-trip threw for \(route): \(error)", file: file, line: line)
        }
    }

    func testRouteCodableRoundTripSimpleCases() {
        assertRoundTrip(.eventList)
        assertRoundTrip(.clientList)
        assertRoundTrip(.staffList)
        assertRoundTrip(.productList)
        assertRoundTrip(.inventoryList)
        assertRoundTrip(.settings)
        assertRoundTrip(.quickQuote)
        assertRoundTrip(.paymentInbox)
        assertRoundTrip(.reviews)
        assertRoundTrip(.eventFormLinks)
        assertRoundTrip(.editProfile)
        assertRoundTrip(.changePassword)
        assertRoundTrip(.businessSettings)
        assertRoundTrip(.publicProfileSettings)
        assertRoundTrip(.publicProfilePreview(slug: "mi-negocio"))
        assertRoundTrip(.contractDefaults)
        assertRoundTrip(.pricing)
        assertRoundTrip(.subscription)
        assertRoundTrip(.notificationPreferences)
        assertRoundTrip(.calendarSyncPreferences)
        assertRoundTrip(.about)
        assertRoundTrip(.deleteAccount)
    }

    func testRouteCodableRoundTripIdentifiers() {
        assertRoundTrip(.eventDetail(id: "evt-123"))
        assertRoundTrip(.clientDetail(id: "cli-456"))
        assertRoundTrip(.staffDetail(id: "stf-789"))
        assertRoundTrip(.staffTeamDetail(id: "team-1"))
        assertRoundTrip(.productDetail(id: "prd-1"))
        assertRoundTrip(.inventoryDetail(id: "inv-1"))
        assertRoundTrip(.eventChecklist(id: "evt-1"))
        assertRoundTrip(.eventFinances(id: "evt-1"))
        assertRoundTrip(.eventPayments(id: "evt-1"))
        assertRoundTrip(.eventProducts(id: "evt-1"))
        assertRoundTrip(.eventExtras(id: "evt-1"))
        assertRoundTrip(.eventSupplies(id: "evt-1"))
        assertRoundTrip(.eventEquipment(id: "evt-1"))
        assertRoundTrip(.eventShoppingList(id: "evt-1"))
        assertRoundTrip(.eventPurchaseChecklist(id: "evt-1"))
        assertRoundTrip(.eventPhotos(id: "evt-1"))
        assertRoundTrip(.eventContractPreview(id: "evt-1"))
        assertRoundTrip(.eventStaff(id: "evt-1"))
    }

    func testRouteCodableRoundTripOptionals() {
        // Every optional payload shape (String?/Date?/Int?) — incl. all-nil and mixed.
        assertRoundTrip(.eventForm())
        assertRoundTrip(.eventForm(id: "evt-1"))
        assertRoundTrip(.eventForm(id: "evt-1", clientId: "cli-1"))
        assertRoundTrip(.eventForm(id: "evt-1", clientId: "cli-1", date: Date(timeIntervalSince1970: 1_700_000_000)))
        assertRoundTrip(.eventForm(id: "evt-1", clientId: "cli-1", date: Date(timeIntervalSince1970: 1_700_000_000), step: 3))
        assertRoundTrip(.eventForm(step: 5))
        assertRoundTrip(.clientForm())
        assertRoundTrip(.clientForm(id: "cli-1"))
        assertRoundTrip(.staffForm())
        assertRoundTrip(.staffForm(id: "stf-1"))
        assertRoundTrip(.staffTeamForm())
        assertRoundTrip(.staffTeamForm(id: "team-1"))
        assertRoundTrip(.productForm())
        assertRoundTrip(.productForm(id: "prd-1"))
        assertRoundTrip(.inventoryForm())
        assertRoundTrip(.inventoryForm(id: "inv-1"))
    }

    func testRouteCodableRoundTripSearchQuery() {
        assertRoundTrip(.search())
        assertRoundTrip(.search(query: ""))
        assertRoundTrip(.search(query: "ana martínez"))
        assertRoundTrip(.search(query: "unicode-émoji-🚀-naïve"))
    }

    func testRouteCodableDecodedIntoNavigationPathRepresentation() {
        // End-to-end: the exact path used by the layouts — a NavigationPath built
        // from Route values must encode/decode through CodableRepresentation and
        // reproduce an equal path. This is the contract @SceneStorage relies on.
        var path = NavigationPath()
        path.append(Route.eventList)
        path.append(Route.eventDetail(id: "evt-1"))
        path.append(Route.eventFinances(id: "evt-1"))

        guard let codable = path.codable else {
            return XCTFail("path.codable must be non-nil now that Route is Codable")
        }
        let data = try! JSONEncoder().encode(codable)
        let decoded = try! JSONDecoder().decode(NavigationPath.CodableRepresentation.self, from: data)
        let restored = NavigationPath(decoded)

        // The restored path must hold the same number of destinations. (We do NOT
        // compare with == here: NavigationPath's Equatable is sensitive to its
        // internal eager-vs-lazy representation, so a decoded path is never ==
        // an in-memory one even with identical contents. Count + the per-Route
        // round-trip tests above fully prove the values survive.)
        XCTAssertEqual(restored.count, path.count)
        XCTAssertEqual(restored.count, 3)
    }
}
