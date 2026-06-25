import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 4.5 — "Period Date-Range Filter Chips" (`events-calendar` delta).
///
/// Spec scenarios:
///   Hoy and Esta semana apply bounded ranges
///     GIVEN Eventos showing events across several days
///     WHEN  the user taps `Hoy`
///     THEN  only today's events MUST be shown
///     WHEN  the user then taps `Esta semana`
///     THEN  only events within the current calendar week MUST be shown
///
///   Personalizado defines a start-then-end range
///     GIVEN Eventos in either mode
///     WHEN  the user selects `Personalizado`, taps a start date, then taps an end date
///     THEN  the filter MUST span `[start, end]` inclusive
///     AND   only events within that range MUST be shown
///
/// How this is enforced structurally (ADR-8 seam philosophy, mirrors 4.4's
/// `EventListCalendarGestures`): the chip row (`EventListPeriodFilterBar`) routes
/// every tap through the stateless `EventListPeriodFilterActions` seam, which
/// maps each chip to the EXISTING `EventListViewModel` setters from task 3.3:
///   • `selectChip(.today / .thisWeek / .thisMonth)` → `setPeriodFilter(_:)`
///   • `selectChip(.custom)`                        → `setPeriodFilter(.custom)`
///                                                  + asks the view to present
///                                                    the start-then-end picker
///   • `commitCustomRange(start:end:)`              → `selectCustomRangeStart`
///                                                  then `selectCustomRangeEnd`
///
/// Task 3.3 already pins the shared-filter invariant (a chip and a day-tap both
/// write the same `dateRange*` pair and clear each other's selection). These
/// tests pin the chip→setter WIRING that 4.5 adds — that each chip reaches the
/// correct setter and produces the expected VM state — following the same
/// VM-level callback-wiring assertion style as 4.2 / 4.4.
final class EventListViewPeriodFilterTests: XCTestCase {

    // MARK: - Helpers

    private func makeActions(presentedFlag: PresentedFlag = PresentedFlag())
        -> (EventListPeriodFilterActions, PresentedFlag)
    {
        let vm = EventListViewModel(apiClient: APIClient(), eventRepository: nil)
        let flag = presentedFlag
        let actions = EventListPeriodFilterActions(
            viewModel: vm,
            presentCustomRangePicker: { flag.didPresent = true }
        )
        return (actions, flag)
    }

    /// Captures whether the custom-range picker was requested by the seam.
    final class PresentedFlag {
        var didPresent = false
    }

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        Calendar.current.date(from: DateComponents(year: year, month: month, day: day))!
    }

    private func startOfDay(_ d: Date) -> Date {
        Calendar.current.startOfDay(for: d)
    }

    // MARK: - Bounded chips route to setPeriodFilter(_:) and clear selectedDay

    func testChipHoyRoutesToSetPeriodToday() {
        let (actions, _) = makeActions()
        let vm = actions.viewModel
        // Pre-seed a selectedDay so we can prove the chip clears it.
        vm.selectDate(date(2026, 6, 15))

        actions.selectChip(.today)

        XCTAssertEqual(vm.periodFilter, .today, "Hoy activates the .today chip")
        XCTAssertNil(vm.selectedDay, "a period chip clears the selected day")
        XCTAssertEqual(vm.dateRangeStart, startOfDay(Date()), "Hoy starts at today's start-of-day")
        XCTAssertEqual(vm.dateRangeEnd, startOfDay(Date()), "Hoy ends at today's start-of-day")
    }

    func testChipEstaSemanaRoutesToSetPeriodThisWeek() {
        let (actions, _) = makeActions()
        let vm = actions.viewModel
        let cal = Calendar.current
        let weekInterval = cal.dateInterval(of: .weekOfYear, for: Date())!

        actions.selectChip(.thisWeek)

        XCTAssertEqual(vm.periodFilter, .thisWeek, "Esta semana activates the .thisWeek chip")
        XCTAssertNil(vm.selectedDay)
        XCTAssertEqual(vm.dateRangeStart, weekInterval.start, "Esta semana starts at the first day of the current week")
        let expectedEnd = cal.date(byAdding: .day, value: -1, to: weekInterval.end)
        XCTAssertEqual(vm.dateRangeEnd, expectedEnd, "Esta semana ends at the inclusive last day of the current week")
    }

    func testChipEsteMesRoutesToSetPeriodThisMonth() {
        let (actions, _) = makeActions()
        let vm = actions.viewModel
        let cal = Calendar.current
        let monthInterval = cal.dateInterval(of: .month, for: Date())!

        actions.selectChip(.thisMonth)

        XCTAssertEqual(vm.periodFilter, .thisMonth, "Este mes activates the .thisMonth chip")
        XCTAssertNil(vm.selectedDay)
        XCTAssertEqual(vm.dateRangeStart, monthInterval.start)
        let expectedEnd = cal.date(byAdding: .day, value: -1, to: monthInterval.end)
        XCTAssertEqual(vm.dateRangeEnd, expectedEnd, "Este mes ends at the inclusive last day of the current month")
    }

    // MARK: - Personalizado enters custom mode AND requests the picker

    func testChipPersonalizadoEntersCustomModeAndRequestsPicker() {
        let (actions, flag) = makeActions()
        let vm = actions.viewModel
        XCTAssertFalse(flag.didPresent, "precondition: picker not yet requested")

        actions.selectChip(.custom)

        XCTAssertEqual(vm.periodFilter, .custom, "Personalizado activates the .custom chip")
        // setPeriodFilter(.custom) clears the shared range so re-tapping the
        // chip resets cleanly; the start-then-end taps (below) repopulate it.
        XCTAssertNil(vm.dateRangeStart)
        XCTAssertNil(vm.dateRangeEnd)
        XCTAssertTrue(flag.didPresent, "Personalizado must request the custom-range picker")
    }

    // MARK: - Personalizado two-tap flow: start then end → inclusive [start, end]

    func testCommitCustomRangeAppliesStartThenEndTwoTap() {
        let (actions, _) = makeActions()
        let vm = actions.viewModel
        let start = date(2026, 6, 10)
        let end = date(2026, 6, 20)

        actions.commitCustomRange(start: start, end: end)

        XCTAssertEqual(vm.periodFilter, .custom, "custom commit keeps the .custom chip active")
        XCTAssertEqual(vm.dateRangeStart, startOfDay(start), "range starts at the start date")
        XCTAssertEqual(vm.dateRangeEnd, startOfDay(end), "range ends at the end date (inclusive)")
        XCTAssertNil(vm.selectedDay, "custom range clears the selected day")
    }

    // MARK: - Triangulation: a bounded chip overrides a prior custom range

    func testBoundedChipOverridesPriorCustomRange() {
        let (actions, _) = makeActions()
        let vm = actions.viewModel

        // Establish a custom range first.
        actions.commitCustomRange(start: date(2026, 6, 10), end: date(2026, 6, 20))
        XCTAssertEqual(vm.periodFilter, .custom)

        // Then tap Hoy.
        actions.selectChip(.today)

        XCTAssertEqual(vm.periodFilter, .today, "Hoy overrides the prior Personalizado chip")
        XCTAssertEqual(vm.dateRangeStart, startOfDay(Date()), "Hoy rewrites the shared range start")
        XCTAssertEqual(vm.dateRangeEnd, startOfDay(Date()))
    }

    // MARK: - Chip order matches the spec: Hoy · Esta semana · Este mes · Personalizado

    func testPeriodChipOrderMatchesSpec() {
        // The bar renders the four chips in the spec order. The order is driven
        // by EventPeriodFilter.allCases, which 3.3 already pins — re-asserted
        // here so a future reordering of the enum cannot silently flip the chip
        // row's visual order away from the spec.
        XCTAssertEqual(
            EventPeriodFilter.allCases,
            [.today, .thisWeek, .thisMonth, .custom],
            "chip order must be Hoy · Esta semana · Este mes · Personalizado"
        )
    }
}
