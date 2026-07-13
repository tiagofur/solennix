import XCTest
@testable import Solennix

/// `WidgetDataSync` must not crash when the App Group suite is unavailable
/// (misprovisioned build, missing entitlement). Every sync method no-ops and
/// the app runs without widgets instead of `fatalError`-ing on launch (#814).
///
/// Strategy: instantiate `WidgetDataSync` with an invalid suite name (the
/// internal test init) and exercise every public method. None should crash;
/// the suite resolves to `nil` and each method's `guard let appGroup else
/// { return }` short-circuits.
@MainActor
final class WidgetDataSyncMissingAppGroupTests: XCTestCase {

    /// An invalid suite name that `UserDefaults(suiteName:)` cannot provision,
    /// mirroring the nil-return path the production code defends against.
    private let invalidSuite = "group.com.solennix.does-not-exist.invalid"

    // MARK: - Regression #814: no crash on missing App Group

    func testSyncUpcomingEvents_DoesNotCrash_WhenAppGroupMissing() {
        let sync = WidgetDataSync(suiteName: invalidSuite)
        // No crash — the method no-ops when appGroup is nil.
        sync.syncUpcomingEvents([])
    }

    func testSyncKPIs_DoesNotCrash_WhenAppGroupMissing() {
        let sync = WidgetDataSync(suiteName: invalidSuite)
        let kpis = WidgetKPIData.from(
            monthlyRevenue: 1000, eventsThisMonth: 1, eventsThisWeek: 1,
            lowStockCount: 0, pendingPayments: 0,
            confirmedEvents: 1, quotedEvents: 0
        )
        sync.syncKPIs(kpis)
    }

    func testSyncUserPlan_DoesNotCrash_WhenAppGroupMissing() {
        let sync = WidgetDataSync(suiteName: invalidSuite)
        sync.syncUserPlan("pro")
        sync.syncUserPlan(nil)
        sync.syncUserPlan("")
    }

    func testSyncCurrencyCode_DoesNotCrash_WhenAppGroupMissing() {
        let sync = WidgetDataSync(suiteName: invalidSuite)
        sync.syncCurrencyCode("USD")
        sync.syncCurrencyCode(nil)
    }

    func testSetAuthState_DoesNotCrash_WhenAppGroupMissing() {
        let sync = WidgetDataSync(suiteName: invalidSuite)
        sync.setAuthState(.authenticated)
        sync.setAuthState(.signedOut)
    }

    func testClearWidgetData_DoesNotCrash_WhenAppGroupMissing() {
        let sync = WidgetDataSync(suiteName: invalidSuite)
        // clearWidgetData still calls reloadAllWidgets() even with nil suite.
        sync.clearWidgetData()
    }

    // MARK: - Reload methods are always safe (don't touch appGroup)

    func testReloadMethods_DoesNotCrash_WhenAppGroupMissing() {
        let sync = WidgetDataSync(suiteName: invalidSuite)
        // These methods call WidgetCenter directly, not appGroup.
        sync.reloadEventWidgets()
        sync.reloadKPIWidgets()
        sync.reloadAllWidgets()
    }

    // MARK: - Production suite identifier is the expected value

    /// Guards against accidental drift: the constant must match the entitlements
    /// value used by the app, widget extension, and intents extension.
    func testAppGroupIdentifier_MatchesExpectedValue() {
        XCTAssertEqual(WidgetDataSync.appGroupIdentifier, "group.com.solennix.app")
    }
}
