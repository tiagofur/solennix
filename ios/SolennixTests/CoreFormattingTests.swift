import XCTest
import Foundation
import SolennixCore

final class CoreFormattingTests: XCTestCase {

    func testDateFromIsoStringParsesWithAndWithoutFractionalSeconds() {
        let withFraction = Date.from(isoString: "2026-05-20T18:30:45.123Z")
        let withoutFraction = Date.from(isoString: "2026-05-20T18:30:45Z")

        XCTAssertNotNil(withFraction)
        XCTAssertNotNil(withoutFraction)
    }

    func testDateFromIsoStringReturnsNilForInvalidInput() {
        XCTAssertNil(Date.from(isoString: "not-a-date"))
    }

    func testCachedFormatterReturnsSameInstanceForSameStyle() {
        let first = Date.cachedFormatter(style: "yyyy-MM-dd")
        let second = Date.cachedFormatter(style: "yyyy-MM-dd")

        XCTAssertTrue(first === second)
    }

    func testFormattedStyleUsesExpectedPattern() {
        var mexicoCalendar = Calendar(identifier: .gregorian)
        mexicoCalendar.timeZone = Date.mexicanTimeZone
        let date = mexicoCalendar.date(from: DateComponents(year: 2026, month: 5, day: 20, hour: 18, minute: 30))!

        let formatted = date.formatted(style: "yyyy-MM-dd HH:mm")

        XCTAssertEqual(formatted, "2026-05-20 18:30")
    }

    func testFromServerDayParsesDatePrefixAndIgnoresTrailingTime() {
        let parsed = Date.fromServerDay("2026-05-20T12:00:00Z")
        XCTAssertNotNil(parsed)

        var utcCalendar = Calendar(identifier: .gregorian)
        utcCalendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let components = utcCalendar.dateComponents([.year, .month, .day], from: parsed!)
        XCTAssertEqual(components.year, 2026)
        XCTAssertEqual(components.month, 5)
        XCTAssertEqual(components.day, 20)
    }

    // MARK: - Server-day policy tests (issue #528)

    func testFromServerDayUTCCalendarDayMatchesString() {
        // fromServerDay must anchor to midnight UTC so the UTC calendar day
        // equals the original string regardless of the device timezone.
        let date = Date.fromServerDay("2026-06-15")
        XCTAssertNotNil(date)

        var utcCal = Calendar(identifier: .gregorian)
        utcCal.timeZone = TimeZone(secondsFromGMT: 0)!
        let comps = utcCal.dateComponents([.year, .month, .day], from: date!)
        XCTAssertEqual(comps.year,  2026)
        XCTAssertEqual(comps.month, 6)
        XCTAssertEqual(comps.day,   15)
    }

    func testFromServerDayRoundTripIsStableInNegativeOffset() {
        // Simulate a device in UTC-6: parse "2026-06-15" then format back.
        // The displayed day must still be "2026-06-15", not "2026-06-14".
        let date = Date.fromServerDay("2026-06-15")
        XCTAssertNotNil(date)

        // Display with UTC (correct — matches parse timezone)
        let utcDisplay = date!.formattedServerDay(style: "yyyy-MM-dd")
        XCTAssertEqual(utcDisplay, "2026-06-15")

        // Display with UTC-6 (wrong — would show previous day)
        let mxFormatter = DateFormatter()
        mxFormatter.locale = Locale(identifier: "en_US_POSIX")
        mxFormatter.dateFormat = "yyyy-MM-dd"
        mxFormatter.timeZone = TimeZone(secondsFromGMT: -21600)
        let mxDisplay = mxFormatter.string(from: date!)
        XCTAssertEqual(mxDisplay, "2026-06-14",
            "This assertion documents the day-shift bug: a UTC-6 formatter on a UTC-parsed date shows the PREVIOUS day. Use formattedServerDay to avoid this.")
    }

    func testIsServerDayTodayReturnsTrueForLocalToday() {
        // Build today's string in the device's local timezone (same logic as
        // localTodayString) and confirm isServerDayToday returns true.
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        // No timeZone → device local (intentional, mirrors isServerDayToday).
        let localTodayStr = f.string(from: Date())

        XCTAssertTrue(Date.isServerDayToday(localTodayStr))
    }

    func testIsServerDayTodayReturnsFalseForYesterday() {
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        let yesterdayStr = f.string(from: yesterday)

        XCTAssertFalse(Date.isServerDayToday(yesterdayStr))
    }

    func testIsServerDayTodayReturnsFalseForTomorrow() {
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        let tomorrowStr = f.string(from: tomorrow)

        XCTAssertFalse(Date.isServerDayToday(tomorrowStr))
    }

    func testFormattedServerDayPreservesCalendarDayAcrossZones() {
        // Verifies the parse→format round-trip is lossless when explicitly
        // formatting in UTC (simulates what happens in negative-offset zones).
        let serverDate = "2026-12-31"
        let date = Date.fromServerDay(serverDate)!

        // UTC display must match original
        XCTAssertEqual(date.formattedServerDay(style: "yyyy-MM-dd"), serverDate)

        // UTC-8 (Tijuana) would show "2026-12-30" — document the contrast
        let badFormatter = DateFormatter()
        badFormatter.locale = Locale(identifier: "en_US_POSIX")
        badFormatter.dateFormat = "yyyy-MM-dd"
        badFormatter.timeZone = TimeZone(secondsFromGMT: -28800)
        XCTAssertEqual(badFormatter.string(from: date), "2026-12-30")
    }

    func testAsMXNForDoubleAndDecimalIncludeMXNSuffix() {
        let doubleValue = 1234.5.asMXN
        let decimalValue = Decimal(string: "1234.5")!.asMXN

        XCTAssertTrue(doubleValue.hasSuffix(" MXN"))
        XCTAssertTrue(decimalValue.hasSuffix(" MXN"))
        XCTAssertTrue(doubleValue.contains("1234") || doubleValue.contains("1,234"))
        XCTAssertTrue(decimalValue.contains("1234") || decimalValue.contains("1,234"))
    }

    func testLegalURLsAreExpectedCanonicalEndpoints() {
        XCTAssertEqual(LegalURL.terms.absoluteString, "https://creapolis.dev/terms-of-use/")
        XCTAssertEqual(LegalURL.privacy.absoluteString, "https://creapolis.dev/privacy-policy/")
    }
}
