import XCTest
@testable import Solennix

// MARK: - LanguageReporter Throttle Tests
//
// WU4 (ios-system-language): the throttle logic of `LanguageReporter` is the one
// piece of this change that is genuinely TDD-testable in-process. After WU3 removed
// the in-app picker, the app no longer reports the user's language to the backend.
// `LanguageReporter` re-adds reporting via a throttled path: it compares the current
// SYSTEM language code ("es"/"en") against `lastReportedLanguage` (UserDefaults) and
// only calls the backend on a change.
//
// These tests inject a fake store, a controllable "current language" provider, and a
// capturing backend closure — so they assert the throttle contract deterministically
// with no Locale/device dependency.

final class LanguageReporterTests: XCTestCase {

    /// In-memory stand-in for the UserDefaults-backed store.
    private final class FakeStore: LanguageReportStoring {
        var lastReportedLanguage: String?
        init(lastReportedLanguage: String? = nil) {
            self.lastReportedLanguage = lastReportedLanguage
        }
    }

    // MARK: - Throttle: no-op when already reported

    /// When the current language equals the last reported value, the backend MUST NOT
    /// be called and `reportIfNeeded()` returns false (throttled).
    func test_throttle_whenAlreadyReported_doesNotCallBackend() async {
        var reportCalls: [String] = []
        let reporter = LanguageReporter(
            store: FakeStore(lastReportedLanguage: "es"),
            currentLanguageProvider: { "es" },
            report: { code in reportCalls.append(code) }
        )

        let reported = await reporter.reportIfNeeded()

        XCTAssertFalse(reported, "reportIfNeeded() must be a no-op (false) when current == lastReported.")
        XCTAssertTrue(reportCalls.isEmpty, "Backend MUST NOT be called when current == lastReported.")
    }

    // MARK: - Report on change

    /// When the current language differs from the last reported value, the backend MUST
    /// be called once with the new code, `reportIfNeeded()` returns true, and the new
    /// value is persisted to the store.
    func test_reports_whenChanged_callsBackendAndPersists() async {
        let store = FakeStore(lastReportedLanguage: "en")
        var reportCalls: [String] = []
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            report: { code in reportCalls.append(code) }
        )

        let reported = await reporter.reportIfNeeded()

        XCTAssertTrue(reported, "reportIfNeeded() must report (true) when current != lastReported.")
        XCTAssertEqual(reportCalls, ["es"], "Backend must be called exactly once with the new code.")
        XCTAssertEqual(store.lastReportedLanguage, "es", "On success the new value must be persisted.")
    }

    // MARK: - Report on first launch (never reported)

    /// On first launch (lastReportedLanguage == nil) the backend MUST be called and the
    /// value persisted.
    func test_reports_onFirstLaunch_neverReported() async {
        let store = FakeStore(lastReportedLanguage: nil)
        var reportCalls: [String] = []
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            report: { code in reportCalls.append(code) }
        )

        let reported = await reporter.reportIfNeeded()

        XCTAssertTrue(reported, "First launch (nil) must report.")
        XCTAssertEqual(reportCalls, ["es"], "Backend must be called once on first launch.")
        XCTAssertEqual(store.lastReportedLanguage, "es", "First-launch value must be persisted.")
    }

    // MARK: - Failure handling

    /// When the backend call throws, the old value MUST be kept (so the next fire
    /// retries) and `reportIfNeeded()` returns false.
    func test_onFailure_keepsOldValueAndRetriesNextTime() async {
        let store = FakeStore(lastReportedLanguage: "en")
        var attempts = 0
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            report: { _ in
                attempts += 1
                throw NSError(domain: "LanguageReporterTests", code: 1)
            }
        )

        let first = await reporter.reportIfNeeded()

        XCTAssertFalse(first, "A failed report returns false.")
        XCTAssertEqual(attempts, 1, "Backend must be attempted exactly once.")
        XCTAssertEqual(store.lastReportedLanguage, "en",
                       "On failure the old value is kept so the next fire retries.")
    }

    // MARK: - Back-to-back: report then throttle

    /// After a successful report, an immediate second call MUST be throttled (proves the
    /// persist+compare loop closes — no re-report storms).
    func test_afterReportImmediateSecondCallIsThrottled() async {
        let store = FakeStore(lastReportedLanguage: "en")
        var reportCalls: [String] = []
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            report: { code in reportCalls.append(code) }
        )

        _ = await reporter.reportIfNeeded()          // reports + persists "es"
        let second = await reporter.reportIfNeeded() // same current -> throttled

        XCTAssertTrue(second == false, "Second consecutive call must be throttled.")
        XCTAssertEqual(reportCalls, ["es"], "Backend must be called exactly once across both calls.")
    }
}
