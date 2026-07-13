import XCTest
@testable import Solennix

/// Verifies which `UserDefaults` keys are cleared vs preserved on logout.
///
/// `hasSeenOnboarding` is device-scoped: clearing it forced a full onboarding
/// replay on every logout/login of the same device (#810). Parity with Android
/// (`has_seen_onboarding` survives signOut).
final class SessionCleanupUserDefaultsTests: XCTestCase {

    private let perUserKeys = [
        "hasRequestedPushAuthorization",
        "pendingDeviceToken",
        "registeredDeviceToken",
    ]

    override func tearDown() async throws {
        // Restore a clean state so one test's writes don't leak into another.
        UserDefaults.standard.removeObject(forKey: "hasSeenOnboarding")
        for key in perUserKeys {
            UserDefaults.standard.removeObject(forKey: key)
        }
        try await super.tearDown()
    }

    // MARK: - Regression #810: hasSeenOnboarding survives session cleanup

    /// Onboarding completion must persist across logout — the next login on the
    /// same device must NOT replay the onboarding flow.
    func testClearPerUserUserDefaults_PreservesHasSeenOnboarding() {
        UserDefaults.standard.set(true, forKey: "hasSeenOnboarding")

        SolennixApp.clearPerUserUserDefaults()

        XCTAssertTrue(UserDefaults.standard.bool(forKey: "hasSeenOnboarding"),
                      "hasSeenOnboarding must survive logout — onboarding is device-scoped, not per-session (#810)")
    }

    // MARK: - Per-user keys ARE cleared

    /// The keys that ARE per-session must still be cleared on logout.
    func testClearPerUserUserDefaults_ClearsPerSessionKeys() {
        for key in perUserKeys {
            UserDefaults.standard.set("stale-value", forKey: key)
        }

        SolennixApp.clearPerUserUserDefaults()

        for key in perUserKeys {
            XCTAssertNil(UserDefaults.standard.object(forKey: key),
                         "\(key) must be cleared on logout")
        }
    }
}
