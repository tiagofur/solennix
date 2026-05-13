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
