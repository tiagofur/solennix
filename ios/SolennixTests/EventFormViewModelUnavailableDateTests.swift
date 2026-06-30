import XCTest
import Foundation
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Coverage for the event form's blocked-date behavior (T2/T6): unavailable
/// lookup propagation, the inline warning (reason/no-reason), the timezone-safe
/// grid↔eventDate mapping (ADR-1, including the pinned UTC+5 day-shift guard),
/// and the client-side save guard (ADR-4).
///
/// APIClient is a concrete `actor` with no protocol/mock surface in this
/// codebase, and every existing VM test mutates state directly (no network).
/// These tests follow that convention: a successful fetch is modeled by
/// injecting `unavailableDates` directly (the exact post-fetch state), and a
/// failed fetch is modeled by leaving the list empty (`loadUnavailableDates`
/// swallows errors via `try?`, so the list stays empty/unchanged). This makes
/// the suite deterministic and network-free.
final class EventFormViewModelUnavailableDateTests: XCTestCase {

    private func makeVM() -> EventFormViewModel {
        EventFormViewModel(apiClient: APIClient())
    }

    // MARK: - 1. Fetch propagation (successful-fetch state → picker + guard)

    func testUnavailableDatesPropagateToBlockedLookup() {
        let vm = makeVM()
        let todayStr = Date.utcDayFormatter.string(from: vm.eventDate)
        vm.unavailableDates = [
            UnavailableDate(id: "u1", userId: "u", startDate: todayStr, endDate: todayStr, reason: "Vacaciones")
        ]

        // The save-guard path (eventDate is UTC-midnight → UTC day string).
        XCTAssertNotNil(vm.unavailableDateFor(vm.eventDate))
        // The grid path (LOCAL-midnight pickerSelectedDay → LOCAL day string).
        XCTAssertTrue(vm.isDateBlocked(vm.pickerSelectedDay))
    }

    func testRangeOutsideSelectedDayIsNotBlocked() {
        let vm = makeVM()
        vm.unavailableDates = [
            UnavailableDate(id: "u1", userId: "u", startDate: "2099-01-01", endDate: "2099-01-31")
        ]
        XCTAssertNil(vm.unavailableDateFor(vm.eventDate))
        XCTAssertFalse(vm.isDateBlocked(vm.pickerSelectedDay))
    }

    // MARK: - 2. checkDateAvailability warning (reason / no-reason / clear)

    @MainActor
    func testCheckDateAvailability_setsWarningWithReason_thenClears() {
        let vm = makeVM()
        let dayStr = Date.utcDayFormatter.string(from: vm.eventDate)
        vm.unavailableDates = [
            UnavailableDate(id: "u", userId: "u", startDate: dayStr, endDate: dayStr, reason: "Vacaciones")
        ]

        vm.checkDateAvailability(vm.eventDate)
        let withReason = vm.dateUnavailableWarning
        XCTAssertNotNil(withReason)
        XCTAssertTrue(withReason?.contains("Vacaciones") == true, "warning must include the reason")

        // Clearing: remove the blocked range and re-check → warning clears.
        vm.unavailableDates = []
        vm.checkDateAvailability(vm.eventDate)
        XCTAssertNil(vm.dateUnavailableWarning)
    }

    @MainActor
    func testCheckDateAvailability_noReason_usesPlainVariant() {
        let vm = makeVM()
        let dayStr = Date.utcDayFormatter.string(from: vm.eventDate)
        vm.unavailableDates = [
            UnavailableDate(id: "u", userId: "u", startDate: dayStr, endDate: dayStr)
        ]

        vm.checkDateAvailability(vm.eventDate)
        XCTAssertNotNil(vm.dateUnavailableWarning)
        // No leaked "%@" placeholder.
        XCTAssertFalse(vm.dateUnavailableWarning?.contains("%@") ?? true)
    }

    // MARK: - 3. Timezone-safe grid→eventDate mapping (ADR-1)

    @MainActor
    func testSelectPickerDay_UTCPlus5_doesNotShiftDay() {
        // PINNED TZ TEST — the #1 regression risk. On a UTC+5 device, the grid
        // cell for local June 15 is 2026-06-15 00:00 +05:00 = 2026-06-14 19:00
        // UTC. A naive `eventDate = day.date` would store the UTC instant and
        // the UTC day string would read "2026-06-14" (one day lost). The
        // day-string roundtrip must yield "2026-06-15".
        let originalTZ = NSTimeZone.default
        NSTimeZone.default = TimeZone(secondsFromGMT: 5 * 3600)!
        NSTimeZone.resetSystemTimeZone()
        defer {
            NSTimeZone.default = originalTZ
            NSTimeZone.resetSystemTimeZone()
        }

        let vm = makeVM()

        var cal = Calendar.current
        cal.timeZone = TimeZone(secondsFromGMT: 5 * 3600)!
        var dc = DateComponents()
        dc.year = 2026
        dc.month = 6
        dc.day = 15
        let localMidnightJune15 = cal.date(from: dc)!

        vm.selectPickerDay(localMidnightJune15)

        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), "2026-06-15")
        XCTAssertNotEqual(Date.utcDayFormatter.string(from: vm.eventDate), "2026-06-14")
    }

    @MainActor
    func testSelectPickerDay_negativeOffset_doesNotShiftDay() {
        // Mexico (UTC-6) symmetric check: local June 15 00:00 -06:00 must map
        // to the UTC day string "2026-06-15", not "2026-06-16" / "2026-06-15"+shift.
        let originalTZ = NSTimeZone.default
        NSTimeZone.default = TimeZone(secondsFromGMT: -6 * 3600)!
        NSTimeZone.resetSystemTimeZone()
        defer {
            NSTimeZone.default = originalTZ
            NSTimeZone.resetSystemTimeZone()
        }

        let vm = makeVM()

        var cal = Calendar.current
        cal.timeZone = TimeZone(secondsFromGMT: -6 * 3600)!
        var dc = DateComponents()
        dc.year = 2026
        dc.month = 6
        dc.day = 15
        let localMidnightJune15 = cal.date(from: dc)!

        vm.selectPickerDay(localMidnightJune15)

        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), "2026-06-15")
    }

    @MainActor
    func testPickerSelectedDay_roundtripsSelectedEventDate() {
        // Reverse map (ADR-1): eventDate → grid highlight. Selecting a day then
        // reading pickerSelectedDay must land on the same calendar day so the
        // grid highlights the cell the user tapped.
        let vm = makeVM()
        var cal = Calendar.current
        var dc = DateComponents()
        dc.year = 2026
        dc.month = 6
        dc.day = 15
        let localMidnightJune15 = cal.date(from: dc)!

        vm.selectPickerDay(localMidnightJune15)

        cal = Calendar.current
        let selectedComps = cal.dateComponents([.year, .month, .day], from: vm.pickerSelectedDay)
        XCTAssertEqual(selectedComps.year, 2026)
        XCTAssertEqual(selectedComps.month, 6)
        XCTAssertEqual(selectedComps.day, 15)
    }

    // MARK: - 4. Save guard (ADR-4)

    @MainActor
    func testSaveGuard_blocksOnBlockedDate_setsError() async throws {
        let vm = makeVM()
        let dayStr = Date.utcDayFormatter.string(from: vm.eventDate)
        vm.unavailableDates = [
            UnavailableDate(id: "u", userId: "u", startDate: dayStr, endDate: dayStr, reason: "Blocked")
        ]

        // Must short-circuit BEFORE the network: no throw, localized error set.
        try await vm.save()

        let expected = FeatureL10n.text(
            "events.form.error.unavailable_date",
            "La fecha seleccionada no está disponible."
        )
        XCTAssertEqual(vm.errorMessage, expected)
    }

    @MainActor
    func testSaveGuardCondition_nilOnCleanDate() {
        // Clean date: the guard's `unavailableDateFor(eventDate) != nil` is
        // false → save() proceeds past the guard (deterministic, no network).
        let vm = makeVM()
        vm.unavailableDates = []
        XCTAssertNil(vm.unavailableDateFor(vm.eventDate), "clean date must not trip the guard")
    }

    // MARK: - 5. Fetch-failure resilience (non-critical)

    @MainActor
    func testFailedFetchLeavesFormUsableAndDoesNotFalselyBlock() {
        // A failed `loadUnavailableDates()` swallows the error via `try?` and
        // leaves `unavailableDates` empty (the post-failure state). The form
        // must stay usable: no warning, and the save guard must not falsely
        // block the selected day.
        let vm = makeVM()
        // Post-failure state: empty list.
        XCTAssertEqual(vm.unavailableDates, [])

        vm.checkDateAvailability(vm.eventDate)
        XCTAssertNil(vm.dateUnavailableWarning)
        XCTAssertNil(vm.unavailableDateFor(vm.eventDate), "save must not be falsely blocked after a failed fetch")
    }

    // MARK: - ADR-5: month navigation must not clear eventDate

    @MainActor
    func testMonthNavigation_doesNotClearEventDate() {
        let vm = makeVM()
        let original = vm.eventDate
        let originalStr = Date.utcDayFormatter.string(from: original)

        vm.goToPreviousMonth()
        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), originalStr)
        vm.goToNextMonth()
        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), originalStr)
        vm.goToNextMonth()
        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), originalStr,
                       "nav must mutate currentMonth only — never eventDate (ADR-5)")
    }

    // MARK: - 6. New-event default auto-skip (Android #696 parity)

    @MainActor
    func testAutoSkip_newEventBlockedDefault_advancesToFirstNonBlockedDay() {
        // Create mode: eventDate defaults to today. If today is blocked, the
        // load path advances day-by-day to the first non-blocked day.
        let vm = makeVM()
        XCTAssertFalse(vm.isEdit, "precondition: create mode")

        var utcCal = Calendar(identifier: .gregorian)
        utcCal.timeZone = TimeZone(secondsFromGMT: 0)!
        let today = vm.eventDate
        let tomorrow = utcCal.date(byAdding: .day, value: 1, to: today)!
        let dayAfter = utcCal.date(byAdding: .day, value: 2, to: today)!

        // Block today + tomorrow; leave the day after open.
        vm.unavailableDates = [
            UnavailableDate(id: "a", userId: "u",
                            startDate: Date.utcDayFormatter.string(from: today),
                            endDate: Date.utcDayFormatter.string(from: today)),
            UnavailableDate(id: "b", userId: "u",
                            startDate: Date.utcDayFormatter.string(from: tomorrow),
                            endDate: Date.utcDayFormatter.string(from: tomorrow))
        ]
        let expected = Date.utcDayFormatter.string(from: dayAfter)

        // Mirror the post-fetch load-path sequence (loadInitialData).
        vm.advancePastBlockedDefaultIfNeeded()

        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), expected,
                       "new event on a blocked default must auto-skip to the first non-blocked day")
        XCTAssertNil(vm.unavailableDateFor(vm.eventDate),
                     "auto-skipped day must not itself be blocked")
    }

    @MainActor
    func testAutoSkip_editModeKeepsBlockedEventDate() {
        // Edit mode MUST NOT auto-skip: an existing event keeps its date even
        // when blocked (the inline warning + save guard still defend).
        let vm = makeVM()
        vm.isEdit = true
        vm.editId = "existing-event-id"

        var utcCal = Calendar(identifier: .gregorian)
        utcCal.timeZone = TimeZone(secondsFromGMT: 0)!
        var dc = DateComponents()
        dc.year = 2026
        dc.month = 6
        dc.day = 15
        let blocked = utcCal.date(from: dc)!
        vm.eventDate = blocked
        let blockedStr = Date.utcDayFormatter.string(from: blocked)
        vm.unavailableDates = [
            UnavailableDate(id: "u", userId: "u", startDate: blockedStr, endDate: blockedStr)
        ]

        vm.advancePastBlockedDefaultIfNeeded()

        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), blockedStr,
                       "edit mode must NOT auto-skip — keep the existing event's date")
    }

    @MainActor
    func testAutoSkip_cleanDefault_isNoOp() {
        // A clean default (today not blocked) must not move eventDate.
        let vm = makeVM()
        let originalStr = Date.utcDayFormatter.string(from: vm.eventDate)

        vm.advancePastBlockedDefaultIfNeeded()

        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), originalStr)
    }

    // MARK: - 7. Disable-select in the form picker (Android #696 parity)

    @MainActor
    func testSelectPickerDay_blockedDay_isNotSelectable() {
        // Tapping a blocked cell must NOT change eventDate / the grid highlight.
        let vm = makeVM()
        let originalStr = Date.utcDayFormatter.string(from: vm.eventDate)
        vm.unavailableDates = [
            UnavailableDate(id: "u", userId: "u", startDate: originalStr, endDate: originalStr)
        ]
        // The grid passes the cell's local-midnight; pickerSelectedDay is
        // exactly that for the selected eventDate.
        let blockedCell = vm.pickerSelectedDay
        XCTAssertTrue(vm.isDateBlocked(blockedCell), "precondition: cell renders blocked")

        let accepted = vm.selectPickerDay(blockedCell)

        XCTAssertFalse(accepted, "blocked day must be rejected (not selectable)")
        XCTAssertEqual(Date.utcDayFormatter.string(from: vm.eventDate), originalStr,
                       "blocked tap must leave eventDate unchanged")
        XCTAssertEqual(vm.pickerSelectedDay, blockedCell,
                       "blocked tap must leave the grid highlight unchanged")
        XCTAssertNil(vm.dateUnavailableWarning,
                     "an ignored blocked tap must not set a warning")
    }
}
