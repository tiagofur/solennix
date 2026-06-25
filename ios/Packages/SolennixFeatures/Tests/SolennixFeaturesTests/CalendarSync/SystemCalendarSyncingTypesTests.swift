import XCTest
@testable import SolennixFeatures
import SolennixCore

/// Tests for the `SystemCalendarSyncing` protocol seam and its domain types
/// (ADR-1). The whole point of the seam is that NO `EK*` type crosses the boundary:
/// `SyncedDestination` carries only `String` identifiers (because `EKCalendar` is a
/// non-Sendable `NSObject`), so the prod `EventKitSyncService` (Phase 2) resolves
/// them internally and test doubles are trivial.
final class SystemCalendarSyncingTypesTests: XCTestCase {

    // MARK: - SyncDestination (binary, .solennix default)

    func testSyncDestinationHasExactlyTwoCases() {
        XCTAssertEqual(SyncDestination.allCases.count, 2)
        XCTAssertNotNil(SyncDestination(rawValue: "solennix"))
        XCTAssertNotNil(SyncDestination(rawValue: "personal"))
    }

    func testSyncDestinationIsSendableAndEquatable() {
        let a: SyncDestination = .solennix
        let b: SyncDestination = .solennix
        let c: SyncDestination = .personal
        XCTAssertEqual(a, b)
        XCTAssertNotEqual(a, c)
        XCTAssertEqual(a.rawValue, "solennix")
    }

    // MARK: - SyncAuthorization

    func testSyncAuthorizationCarriesAllEventKitStates() {
        // The four authorization states the system calendar can report.
        let cases: [SyncAuthorization] = [.notDetermined, .denied, .restricted, .fullAccess]
        XCTAssertEqual(Set(cases).count, 4, "All four authorization states must be distinct")
        XCTAssertEqual(SyncAuthorization.fullAccess, .fullAccess)
        XCTAssertNotEqual(SyncAuthorization.denied, .fullAccess)
    }

    // MARK: - SyncedItem

    func testSyncedItemEqualityByKey() {
        let a = SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-1")
        let b = SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-1")
        let c = SyncedItem(eventID: "evt-2", calendarItemIdentifier: "ek-1")
        XCTAssertEqual(a, b)
        XCTAssertNotEqual(a, c)
    }

    // MARK: - SyncedDestination (identifier-based, NOT an EKCalendar wrapper)

    func testSyncedDestinationCarriesOnlyStringIdentifiers() {
        let dest = SyncedDestination(calendarIdentifier: "cal-1", sourceIdentifier: "src-1")
        XCTAssertEqual(dest.calendarIdentifier, "cal-1")
        XCTAssertEqual(dest.sourceIdentifier, "src-1")
    }

    func testSyncedDestinationEqualityAndDifference() {
        let a = SyncedDestination(calendarIdentifier: "cal-1", sourceIdentifier: "src-1")
        let b = SyncedDestination(calendarIdentifier: "cal-1", sourceIdentifier: "src-1")
        let differentCalendar = SyncedDestination(calendarIdentifier: "cal-2", sourceIdentifier: "src-1")
        let differentSource = SyncedDestination(calendarIdentifier: "cal-1", sourceIdentifier: "src-2")
        XCTAssertEqual(a, b)
        XCTAssertNotEqual(a, differentCalendar, "Different calendarIdentifier must not be equal")
        XCTAssertNotEqual(a, differentSource, "Different sourceIdentifier must not be equal")
    }

    // MARK: - SyncError

    func testSyncErrorIsSwiftErrorWithPersonalCalendarUnavailable() {
        let error = SyncError.personalCalendarUnavailable
        XCTAssertTrue(error is Error)
    }
}
