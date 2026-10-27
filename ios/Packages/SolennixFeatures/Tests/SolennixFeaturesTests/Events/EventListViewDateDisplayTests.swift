import XCTest
import SolennixCore
@testable import SolennixFeatures

/// Regression: event list showed server dates shifted one day EARLIER for
/// users in negative-offset timezones (e.g. America/Mexico_City, UTC-6).
///
/// Root cause: `EventListView.apiDateFormatter` parses `yyyy-MM-dd` strings at
/// UTC midnight, but the display formatters had no explicit timezone and fell
/// back to the device-local zone — midnight UTC rendered as 18:00 the previous
/// day in UTC-6. The parse/display contract (see `Date.fromServerDay` in
/// SolennixCore) requires BOTH sides pinned to the same zone.
///
/// These tests pin the round-trip `parseEventDate → formattedDisplayDate /
/// formattedShortDate` so the calendar day survives regardless of the host
/// machine's timezone.
final class EventListViewDateDisplayTests: XCTestCase {

    private func assertDaySurvivesRoundTrip(
        _ serverDay: String,
        expectedDay: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard let parsed = EventListView.parseEventDate(serverDay) else {
            XCTFail("parseEventDate failed for \(serverDay)", file: file, line: line)
            return
        }
        let display = EventListView.formattedDisplayDate(parsed)
        XCTAssertTrue(
            display.contains(expectedDay),
            "\(serverDay) → display «\(display)» should keep day \(expectedDay)",
            file: file, line: line
        )
        let short = EventListView.formattedShortDate(parsed)
        XCTAssertTrue(
            short.contains(expectedDay),
            "\(serverDay) → short «\(short)» should keep day \(expectedDay)",
            file: file, line: line
        )
    }

    func testDisplayDateKeepsServerCalendarDay() {
        assertDaySurvivesRoundTrip("2026-10-27", expectedDay: "27")
        assertDaySurvivesRoundTrip("2026-01-01", expectedDay: "1")   // month/year boundary
        assertDaySurvivesRoundTrip("2025-12-31", expectedDay: "31")  // year boundary
    }

    func testParsedDateIsUTCMidnight() {
        // The anchor the display contract depends on: parsing "2026-10-27"
        // must land exactly on 2026-10-27T00:00:00Z, not local midnight.
        let parsed = EventListView.parseEventDate("2026-10-27")
        XCTAssertEqual(parsed?.timeIntervalSince1970, 1_793_059_200) // 2026-10-27T00:00:00Z
    }

    func testDisplayFormatterIsUTCNotLocal() {
        // Structural guard: a local formatter would render the previous day
        // whenever the host timezone is west of UTC. Compare against the same
        // date formatted through SolennixCore's UTC contract — they must agree.
        guard let parsed = EventListView.parseEventDate("2026-10-27") else {
            return XCTFail("parse failed")
        }
        let coreUtc = parsed.formattedServerDay(style: "d MMM yyyy")
        XCTAssertEqual(EventListView.formattedDisplayDate(parsed).lowercased(),
                       coreUtc.lowercased())
    }
}
