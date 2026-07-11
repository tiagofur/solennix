import XCTest
@testable import SolennixCore

// MARK: - DateFormatting Policy Tests (issue #528)
//
// Verifies the server-day parse/display contract:
//   • fromServerDay anchors to midnight UTC
//   • formattedServerDay uses UTC — round-trip is lossless
//   • isServerDayToday uses device-local time (intentional)

final class DateFormattingTests: XCTestCase {

    // MARK: - fromServerDay UTC anchor

    func testFromServerDayUTCCalendarDayMatchesString() {
        // The UTC calendar day extracted from the parsed Date must equal the
        // original yyyy-MM-dd string.
        let date = Date.fromServerDay("2026-06-15")
        XCTAssertNotNil(date)

        var utcCal = Calendar(identifier: .gregorian)
        utcCal.timeZone = TimeZone(secondsFromGMT: 0)!
        let comps = utcCal.dateComponents([.year, .month, .day], from: date!)
        XCTAssertEqual(comps.year,  2026)
        XCTAssertEqual(comps.month, 6)
        XCTAssertEqual(comps.day,   15)
    }

    func testFromServerDayParsesDateOnlyString() {
        XCTAssertNotNil(Date.fromServerDay("2026-01-01"))
        XCTAssertNotNil(Date.fromServerDay("2026-12-31"))
    }

    func testFromServerDayStripsTrailingTimestamp() {
        let withTime    = Date.fromServerDay("2026-06-15T12:00:00Z")
        let withoutTime = Date.fromServerDay("2026-06-15")
        XCTAssertNotNil(withTime)
        XCTAssertNotNil(withoutTime)
        XCTAssertEqual(withTime, withoutTime,
            "Trailing time component must be ignored; only the date prefix is parsed.")
    }

    func testFromServerDayReturnsNilForGarbage() {
        XCTAssertNil(Date.fromServerDay("not-a-date"))
        XCTAssertNil(Date.fromServerDay(""))
    }

    // MARK: - fromServerDayLocal LOCAL anchor (issue #714)

    // The widget renders eventDate via Calendar.current, so it MUST be parsed as
    // LOCAL midnight. These tests pin the timezone to extreme offsets so the
    // off-by-one (UTC midnight → previous local day in negative offsets) is
    // caught deterministically on EVERY test host, not only those west of UTC.

    func testFromServerDayLocalAnchorsLocalMidnightAcrossTimezones() {
        let offsets: [(name: String, seconds: Int)] = [
            ("UTC-12",   -12 * 3600),
            ("UTC",        0),
            ("UTC+14",   14 * 3600)
        ]
        let cases: [(serverDay: String, day: Int, month: Int, year: Int)] = [
            ("2026-07-01", 1, 7, 2026),
            ("2026-12-31", 31, 12, 2026)
        ]
        for tz in offsets {
            guard let timezone = TimeZone(secondsFromGMT: tz.seconds) else {
                XCTFail("Could not construct timezone for \(tz.name)"); continue
            }
            for c in cases {
                guard let date = Date.fromServerDayLocal(c.serverDay, timeZone: timezone) else {
                    XCTFail("\(c.serverDay) did not parse in \(tz.name)"); continue
                }
                var cal = Calendar(identifier: .gregorian)
                cal.timeZone = timezone
                let comps = cal.dateComponents([.year, .month, .day], from: date)
                XCTAssertEqual(comps.year,  c.year,  "year mismatch for \(c.serverDay) @ \(tz.name)")
                XCTAssertEqual(comps.month, c.month, "month mismatch for \(c.serverDay) @ \(tz.name)")
                XCTAssertEqual(comps.day,   c.day,   "day mismatch for \(c.serverDay) @ \(tz.name)")
            }
        }
    }

    /// Proves `fromServerDayLocal` prevents the widget off-by-one for users
    /// WEST of UTC — the exact bug from #713. Parsing "2026-07-01" as UTC
    /// midnight then reading it with a UTC-3 calendar yields June 30 (one day
    /// early). The LOCAL-midnight parse must keep July 1 in that calendar.
    func testFromServerDayLocalPreventsWestOfUTCDayShift() {
        let utcMinus3 = TimeZone(secondsFromGMT: -3 * 3600)!
        var localCal = Calendar(identifier: .gregorian)
        localCal.timeZone = utcMinus3

        let correct = Date.fromServerDayLocal("2026-07-01", timeZone: utcMinus3)!
        let buggyUTC = Date.fromServerDay("2026-07-01")!  // UTC midnight

        // Correct (LOCAL) parse: the local calendar reads July 1.
        XCTAssertEqual(localCal.component(.day,   from: correct), 1)
        XCTAssertEqual(localCal.component(.month, from: correct), 7)

        // Documents the bug: the UTC-midnight parse reads June 30 here, one day
        // earlier — why the widget showed the wrong day before #713/#714.
        XCTAssertEqual(localCal.component(.day,   from: buggyUTC), 30,
            "UTC-midnight parse must shift one day earlier in a negative-offset calendar")
        XCTAssertEqual(localCal.component(.month, from: buggyUTC), 6)

        // For a negative offset, LOCAL midnight is a LATER absolute instant than
        // UTC midnight (the negative-offset day starts after UTC's). +3h here.
        XCTAssertGreaterThan(correct, buggyUTC)
        XCTAssertEqual(correct.timeIntervalSince(buggyUTC), 3 * 3600, accuracy: 1.0)
    }

    func testFromServerDayLocalStripsTrailingTimestamp() {
        // Tolerates full-ISO server inputs (mirrors fromServerDay + the working
        // WidgetEventData.from path, both of which apply .prefix(10)).
        XCTAssertEqual(
            Date.fromServerDayLocal("2026-07-01"),
            Date.fromServerDayLocal("2026-07-01T23:59:59Z")
        )
    }

    func testFromServerDayLocalReturnsNilForGarbage() {
        XCTAssertNil(Date.fromServerDayLocal("not-a-date"))
        XCTAssertNil(Date.fromServerDayLocal(""))
    }

    // MARK: - Round-trip parse→format is lossless

    func testFormattedServerDayRoundTripPreservesDay() {
        // Explicitly verifies that using UTC display with a UTC-parsed Date
        // preserves the calendar day — the core fix for the day-shift bug.
        let cases = ["2026-01-01", "2026-06-15", "2026-12-31", "2026-02-28"]
        for serverDay in cases {
            let date = Date.fromServerDay(serverDay)!
            let formatted = date.formattedServerDay(style: "yyyy-MM-dd")
            XCTAssertEqual(formatted, serverDay,
                "Round-trip failed for \(serverDay): got \(formatted)")
        }
    }

    func testNegativeOffsetDisplayerCausesKnownDayShift() {
        // Documents the bug that existed before the fix: formatting a UTC-parsed
        // Date with a UTC-6 formatter yields the previous calendar day.
        let date = Date.fromServerDay("2026-06-15")!

        let badFormatter = DateFormatter()
        badFormatter.locale = Locale(identifier: "en_US_POSIX")
        badFormatter.dateFormat = "yyyy-MM-dd"
        badFormatter.timeZone = TimeZone(secondsFromGMT: -21600) // UTC-6 (Mexico)

        XCTAssertEqual(badFormatter.string(from: date), "2026-06-14",
            "Documents the pre-fix bug: a UTC-6 formatter shows 2026-06-14 for a 2026-06-15 server date.")
    }

    func testYearEndRoundTrip() {
        // Regression guard for DST edge: Dec 31 must stay Dec 31.
        let serverDate = "2026-12-31"
        let date = Date.fromServerDay(serverDate)!
        XCTAssertEqual(date.formattedServerDay(style: "yyyy-MM-dd"), serverDate)
    }

    // MARK: - isServerDayToday (device-local — intentional)

    func testIsServerDayTodayReturnsTrueForLocalToday() {
        // Build today's string in device-local time (same logic as localTodayString).
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        // No explicit timeZone → device local (intentional).
        let localTodayStr = f.string(from: Date())

        XCTAssertTrue(Date.isServerDayToday(localTodayStr))
    }

    func testIsServerDayTodayReturnsFalseForYesterday() {
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        XCTAssertFalse(Date.isServerDayToday(f.string(from: yesterday)))
    }

    func testIsServerDayTodayReturnsFalseForTomorrow() {
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        XCTAssertFalse(Date.isServerDayToday(f.string(from: tomorrow)))
    }

    func testIsServerDayTodayHandlesTrailingTimestamp() {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        let localTodayStr = f.string(from: Date())
        let withTime = localTodayStr + "T10:00:00Z"
        XCTAssertTrue(Date.isServerDayToday(withTime),
            "isServerDayToday must handle server strings that include a time suffix.")
    }

    // MARK: - mexicanTimeZone no longer force-unwraps

    func testMexicanTimeZoneIsNonNilFallback() {
        // TimeZone(secondsFromGMT: -21600) must always succeed (no force-unwrap).
        let tz = Date.mexicanTimeZone
        XCTAssertEqual(tz.secondsFromGMT(), -21600)
    }

    // MARK: - utcMonthRange (server-month boundary — issue #805)

    // Verifies the shared UTC month-range helper used by PlanLimitsManager and
    // DashboardViewModel. The range must be inclusive ([first day, last day]),
    // pinned to UTC, and stable regardless of the device timezone running the
    // test. Input dates are built via `fromServerDay` (UTC midnight) so the test
    // is deterministic on every host.

    func testUtcMonthRangeReturnsInclusiveFirstAndLastDay_January31Days() {
        // Mid-January date → range covers Jan 1 .. Jan 31.
        let date = Date.fromServerDay("2026-01-15")!
        let range = Date.utcMonthRange(for: date)
        XCTAssertEqual(range.start, "2026-01-01")
        XCTAssertEqual(range.end, "2026-01-31")
    }

    func testUtcMonthRangeLastDay_December31Days() {
        let date = Date.fromServerDay("2026-12-01")!
        let range = Date.utcMonthRange(for: date)
        XCTAssertEqual(range.start, "2026-12-01")
        XCTAssertEqual(range.end, "2026-12-31")
    }

    func testUtcMonthRangeLastDay_FebruaryNonLeapYear() {
        // 2027 is not a leap year → February has 28 days.
        let date = Date.fromServerDay("2027-02-10")!
        let range = Date.utcMonthRange(for: date)
        XCTAssertEqual(range.start, "2027-02-01")
        XCTAssertEqual(range.end, "2027-02-28")
    }

    func testUtcMonthRangeLastDay_FebruaryLeapYear() {
        // 2024 is a leap year → February has 29 days.
        let date = Date.fromServerDay("2024-02-10")!
        let range = Date.utcMonthRange(for: date)
        XCTAssertEqual(range.start, "2024-02-01")
        XCTAssertEqual(range.end, "2024-02-29")
    }

    func testUtcMonthRangeLastDay_April30Days() {
        let date = Date.fromServerDay("2026-04-15")!
        let range = Date.utcMonthRange(for: date)
        XCTAssertEqual(range.start, "2026-04-01")
        XCTAssertEqual(range.end, "2026-04-30")
    }

    /// Regression for #805: an instant that is the LAST UTC day of a month must
    /// map to that month, not roll into the next one. Conversely an instant on
    /// the FIRST UTC day must not roll back into the previous month. Both inputs
    /// are UTC-midnight anchors, so the expected range is unambiguous.
    func testUtcMonthRangeBoundaryDaysStayInSameMonth() {
        let lastDay = Date.fromServerDay("2026-01-31")!
        let firstDay = Date.fromServerDay("2026-02-01")!

        let janEdge = Date.utcMonthRange(for: lastDay)
        XCTAssertEqual(janEdge.start, "2026-01-01")
        XCTAssertEqual(janEdge.end, "2026-01-31", "Jan 31 must stay in January")

        let febEdge = Date.utcMonthRange(for: firstDay)
        XCTAssertEqual(febEdge.start, "2026-02-01", "Feb 1 must stay in February")
        XCTAssertEqual(febEdge.end, "2026-02-28")
    }

    /// Direct regression for #805: the range is UTC-pinned, so for an instant
    /// near the UTC midnight that starts a month it must scope that month even
    /// though a negative-offset `Calendar.current` would read the PREVIOUS day.
    /// `TimeZone.current` has no setter, so we prove the bug by showing the UTC
    /// helper disagrees with a hand-built UTC-6 calendar for the same instant.
    func testUtcMonthRangeScopesUtcMonthNotLocalMonth() {
        // 2026-07-01 00:30 UTC. In UTC-6 the local wall clock is 2026-06-30 18:30,
        // so a Calendar.current-based impl would wrongly scope June. The UTC
        // helper must scope July.
        let utcInstant = Date.fromServerDay("2026-07-01")!.addingTimeInterval(30 * 60)
        let utcMinus6 = TimeZone(secondsFromGMT: -6 * 3600)!

        let range = Date.utcMonthRange(for: utcInstant)
        XCTAssertEqual(range.start, "2026-07-01")
        XCTAssertEqual(range.end, "2026-07-31",
            "UTC instant in early July must scope July")

        // Documents the bug: the negative-offset calendar WOULD read June for
        // this instant — i.e. a `Calendar.current` impl on a UTC-6 device scopes
        // the wrong month here. The UTC helper must (and does) disagree.
        var negCal = Calendar(identifier: .gregorian)
        negCal.timeZone = utcMinus6
        XCTAssertEqual(negCal.component(.month, from: utcInstant), 6,
            "sanity: UTC-6 calendar reads June for a July-1 UTC instant — the bug #805 fixed")
        XCTAssertNotEqual(range.start, "2026-06-01",
            "the UTC range must not collapse to the UTC-6 local month")
    }
}
