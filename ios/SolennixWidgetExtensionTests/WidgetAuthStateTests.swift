import XCTest
import SolennixCore

/// `WidgetAuthState.current` (extension-side reader) must default to
/// `.signedOut` when the key is absent (safe pre-login default) and reflect the
/// stored value otherwise — the signal that lets widgets distinguish signed-out
/// from empty data (decision #3137 / REQ-WP-01).
final class WidgetAuthStateTests: XCTestCase {

    private let suite = AppGroup.userDefaults

    override func tearDown() {
        suite.removeObject(forKey: WidgetDataKey.authState)
        super.tearDown()
    }

    func testDefaultsToSignedOutWhenKeyAbsent() {
        suite.removeObject(forKey: WidgetDataKey.authState)
        XCTAssertEqual(WidgetAuthState.current, .signedOut)
    }

    func testReadsAuthenticatedWhenSet() {
        suite.set(WidgetAuthState.authenticated.rawValue, forKey: WidgetDataKey.authState)
        XCTAssertEqual(WidgetAuthState.current, .authenticated)
    }

    func testReadsSignedOutWhenSet() {
        suite.set(WidgetAuthState.signedOut.rawValue, forKey: WidgetDataKey.authState)
        XCTAssertEqual(WidgetAuthState.current, .signedOut)
    }

    func testFallsBackToSignedOutOnGarbageValue() {
        suite.set("not-a-valid-state", forKey: WidgetDataKey.authState)
        XCTAssertEqual(WidgetAuthState.current, .signedOut)
    }
}
