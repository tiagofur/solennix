import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Snapshot tests for the pure presentational sub-components decomposed out of
/// `TeamMemberPortalView` (ADR-8). Each struct takes only plain props + simple
/// closures — no ViewModel, no network. Pinning layout guards against accidental
/// visual regressions when the parent view is edited.
///
/// `TeamMemberAssignment` lives in `SolennixCore` with an internal memberwise
/// init (not openable from this test target), so fixtures are decoded from
/// snake_case JSON with the same `.convertFromSnakeCase` strategy the
/// `APIClient` uses. First run WRITES reference snapshots; later runs assert.
final class TeamMemberPortalComponentsTests: XCTestCase {

    /// Decodes a `TeamMemberAssignment` from snake_case JSON (mirrors APIClient).
    private func assignment(_ json: String) -> TeamMemberAssignment {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try! decoder.decode(TeamMemberAssignment.self, from: Data(json.utf8))
    }

    // MARK: - TeamMemberAssignmentCard

    func testAssignmentCardPendingShowsAcceptDeclineButtons() {
        // pending -> shows the Reject/Accept action row + warning badge.
        let a = assignment("""
        {
            "event_staff_id":"es-1",
            "event_id":"e1",
            "event_name":"Boda García",
            "event_date":"2026-07-20",
            "staff_id":"s1",
            "status":"pending",
            "fee_amount":1500,
            "role_override":"Mesero",
            "notes":"Llegar 30 min antes"
        }
        """)
        let card = TeamMemberAssignmentCard(
            assignment: a,
            isResponding: false,
            onTap: {},
            onAccept: {},
            onDecline: {}
        )
        assertSnapshot(
            of: card.padding(),
            as: .image(layout: .fixed(width: 360, height: 320)),
            testName: "assignment-card-pending"
        )
    }

    func testAssignmentCardConfirmedHidesActionButtons() {
        // confirmed -> no action row, success badge.
        let a = assignment("""
        {
            "event_staff_id":"es-2",
            "event_id":"e2",
            "event_name":"Cumpleaños López",
            "event_date":"2026-08-01",
            "staff_id":"s1",
            "status":"confirmed",
            "fee_amount":900
        }
        """)
        let card = TeamMemberAssignmentCard(
            assignment: a,
            isResponding: false,
            onTap: {},
            onAccept: {},
            onDecline: {}
        )
        assertSnapshot(
            of: card.padding(),
            as: .image(layout: .fixed(width: 360, height: 200)),
            testName: "assignment-card-confirmed"
        )
    }

    // MARK: - TeamPortalCalendarDayCell

    func testCalendarDayCellWithDots() {
        // A current-month, selected day with mixed status dots.
        let day = TeamPortalCalendarDay(
            date: Date.fromServerDay("2026-07-15")!,
            dayNumber: 15,
            isCurrentMonth: true,
            isToday: false,
            isSelected: true
        )
        let cell = TeamPortalCalendarDayCell(
            day: day,
            dots: [.pending, .confirmed],
            onTap: {}
        )
        assertSnapshot(
            of: cell.padding(),
            as: .image(layout: .fixed(width: 120, height: 100)),
            testName: "calendar-day-cell-with-dots"
        )
    }

    func testCalendarDayCellEmptyOtherMonth() {
        // Out-of-month, no dots -> dimmed (opacity 0.35).
        let day = TeamPortalCalendarDay(
            date: Date.fromServerDay("2026-07-01")!,
            dayNumber: 28,
            isCurrentMonth: false,
            isToday: false,
            isSelected: false
        )
        let cell = TeamPortalCalendarDayCell(
            day: day,
            dots: [],
            onTap: {}
        )
        assertSnapshot(
            of: cell.padding(),
            as: .image(layout: .fixed(width: 120, height: 100)),
            testName: "calendar-day-cell-empty"
        )
    }

    // MARK: - TeamPortalTimelineRow

    func testTimelineRowWithTimeRange() {
        let a = assignment("""
        {
            "event_staff_id":"es-3",
            "event_id":"e3",
            "event_name":"Boda Martínez",
            "event_date":"2026-09-10",
            "staff_id":"s1",
            "status":"confirmed"
        }
        """)
        let row = TeamPortalTimelineRow(
            assignment: a,
            timeRange: "16:00 – 23:00",
            onTap: {}
        )
        assertSnapshot(
            of: row.padding(),
            as: .image(layout: .fixed(width: 360, height: 90)),
            testName: "timeline-row-with-time"
        )
    }

    func testTimelineRowWithoutTimeRange() {
        let a = assignment("""
        {
            "event_staff_id":"es-4",
            "event_id":"e4",
            "event_name":"Evento Corto",
            "event_date":"2026-09-11",
            "staff_id":"s1",
            "status":"pending"
        }
        """)
        let row = TeamPortalTimelineRow(
            assignment: a,
            timeRange: nil,
            onTap: {}
        )
        assertSnapshot(
            of: row.padding(),
            as: .image(layout: .fixed(width: 360, height: 90)),
            testName: "timeline-row-no-time"
        )
    }
}
