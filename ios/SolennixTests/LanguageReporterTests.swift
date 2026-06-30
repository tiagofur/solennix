import XCTest
@testable import Solennix

final class LanguageReporterTests: XCTestCase {

    private final class FakeStore: LanguageReportStoring {
        var lastReportedLanguage: String?
        var lastReportedCurrency: String?
        init(lastReportedLanguage: String? = nil, lastReportedCurrency: String? = nil) {
            self.lastReportedLanguage = lastReportedLanguage
            self.lastReportedCurrency = lastReportedCurrency
        }
    }

    // MARK: - Throttle: no-op when already reported

    func test_throttle_whenAlreadyReported_doesNotCallBackend() async {
        var reportCalls: [(String, String)] = []
        let reporter = LanguageReporter(
            store: FakeStore(lastReportedLanguage: "es", lastReportedCurrency: "MXN"),
            currentLanguageProvider: { "es" },
            currentCurrencyProvider: { "MXN" },
            report: { lang, curr in reportCalls.append((lang, curr)) }
        )

        let reported = await reporter.reportIfNeeded()

        XCTAssertFalse(reported, "reportIfNeeded() must be a no-op (false) when current == lastReported.")
        XCTAssertTrue(reportCalls.isEmpty, "Backend MUST NOT be called when current == lastReported.")
    }

    // MARK: - Report on change

    func test_reports_whenLanguageChanged_callsBackendAndPersists() async {
        let store = FakeStore(lastReportedLanguage: "en", lastReportedCurrency: "MXN")
        var reportCalls: [(String, String)] = []
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            currentCurrencyProvider: { "MXN" },
            report: { lang, curr in reportCalls.append((lang, curr)) }
        )

        let reported = await reporter.reportIfNeeded()

        XCTAssertTrue(reported, "reportIfNeeded() must report when language changed.")
        XCTAssertEqual(reportCalls.count, 1)
        XCTAssertEqual(reportCalls[0].0, "es")
        XCTAssertEqual(reportCalls[0].1, "MXN")
        XCTAssertEqual(store.lastReportedLanguage, "es")
        XCTAssertEqual(store.lastReportedCurrency, "MXN")
    }

    func test_reports_whenCurrencyChanged_callsBackendAndPersists() async {
        let store = FakeStore(lastReportedLanguage: "es", lastReportedCurrency: "MXN")
        var reportCalls: [(String, String)] = []
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            currentCurrencyProvider: { "COP" },
            report: { lang, curr in reportCalls.append((lang, curr)) }
        )

        let reported = await reporter.reportIfNeeded()

        XCTAssertTrue(reported, "reportIfNeeded() must report when currency changed.")
        XCTAssertEqual(reportCalls.count, 1)
        XCTAssertEqual(reportCalls[0].0, "es")
        XCTAssertEqual(reportCalls[0].1, "COP")
        XCTAssertEqual(store.lastReportedLanguage, "es")
        XCTAssertEqual(store.lastReportedCurrency, "COP")
    }

    // MARK: - Report on first launch (never reported)

    func test_reports_onFirstLaunch_neverReported() async {
        let store = FakeStore(lastReportedLanguage: nil, lastReportedCurrency: nil)
        var reportCalls: [(String, String)] = []
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            currentCurrencyProvider: { "COP" },
            report: { lang, curr in reportCalls.append((lang, curr)) }
        )

        let reported = await reporter.reportIfNeeded()

        XCTAssertTrue(reported, "First launch must report.")
        XCTAssertEqual(reportCalls.count, 1)
        XCTAssertEqual(reportCalls[0].0, "es")
        XCTAssertEqual(reportCalls[0].1, "COP")
        XCTAssertEqual(store.lastReportedLanguage, "es")
        XCTAssertEqual(store.lastReportedCurrency, "COP")
    }

    // MARK: - Failure handling

    func test_onFailure_keepsOldValueAndRetriesNextTime() async {
        let store = FakeStore(lastReportedLanguage: "en", lastReportedCurrency: "MXN")
        var attempts = 0
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            currentCurrencyProvider: { "COP" },
            report: { _, _ in
                attempts += 1
                throw NSError(domain: "LanguageReporterTests", code: 1)
            }
        )

        let first = await reporter.reportIfNeeded()

        XCTAssertFalse(first, "A failed report returns false.")
        XCTAssertEqual(attempts, 1)
        XCTAssertEqual(store.lastReportedLanguage, "en", "On failure language is kept.")
        XCTAssertEqual(store.lastReportedCurrency, "MXN", "On failure currency is kept.")
    }

    // MARK: - Back-to-back: report then throttle

    func test_afterReportImmediateSecondCallIsThrottled() async {
        let store = FakeStore(lastReportedLanguage: "en", lastReportedCurrency: "MXN")
        var reportCalls: [(String, String)] = []
        let reporter = LanguageReporter(
            store: store,
            currentLanguageProvider: { "es" },
            currentCurrencyProvider: { "COP" },
            report: { lang, curr in reportCalls.append((lang, curr)) }
        )

        _ = await reporter.reportIfNeeded()
        let second = await reporter.reportIfNeeded()

        XCTAssertFalse(second, "Second consecutive call must be throttled.")
        XCTAssertEqual(reportCalls.count, 1)
    }
}
