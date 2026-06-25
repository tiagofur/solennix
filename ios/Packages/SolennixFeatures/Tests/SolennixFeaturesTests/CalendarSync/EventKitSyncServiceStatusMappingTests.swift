import XCTest
import EventKit
@testable import SolennixFeatures
import SolennixCore

/// Tests for the pure `EKAuthorizationStatus → SyncAuthorization` mapping extracted
/// from `EventKitSyncService` (ADR-1).
///
/// `EventKitSyncService` is a real-`EKEventStore` actor that cannot be exercised in a
/// unit test without an EventKit permission prompt, so its behavior is covered
/// transitively through `EventRepository` (Phase 2.2–2.4) using
/// `MockSystemCalendarSyncing`. The ONE piece of pure, side-effect-free logic worth
/// testing directly is how an `EKAuthorizationStatus` maps into the domain enum —
/// that mapping is extracted as a free function so it is unit-testable in isolation
/// (Strict-TDD: extract-before-mock).
final class EventKitSyncServiceStatusMappingTests: XCTestCase {

    // MARK: - Each EventKit status maps to its domain counterpart

    func testNotDeterminedMapsToNotDetermined() {
        XCTAssertEqual(mapEKAuthorizationStatus(.notDetermined), .notDetermined)
    }

    func testRestrictedMapsToRestricted() {
        XCTAssertEqual(mapEKAuthorizationStatus(.restricted), .restricted)
    }

    func testDeniedMapsToDenied() {
        XCTAssertEqual(mapEKAuthorizationStatus(.denied), .denied)
    }

    func testFullAccessMapsToFullAccess() {
        XCTAssertEqual(mapEKAuthorizationStatus(.fullAccess), .fullAccess)
    }

    // MARK: - Triangulation: legacy / writeOnly collapse to fullAccess

    /// iOS 17's `requestFullAccessToEvents` grants `.fullAccess`, but a device that
    /// granted access under the pre-iOS17 API reports `.authorized` (deprecated).
    /// Both represent "we may write" and collapse to `.fullAccess`.
    func testLegacyAuthorizedMapsToFullAccess() {
        XCTAssertEqual(mapEKAuthorizationStatus(.authorized), .fullAccess)
    }

    /// `.writeOnly` still permits the write-only mirror Solennix performs, so it also
    /// maps to `.fullAccess` (we never request writeOnly ourselves, but tolerate it).
    func testWriteOnlyMapsToFullAccess() {
        XCTAssertEqual(mapEKAuthorizationStatus(.writeOnly), .fullAccess)
    }
}
