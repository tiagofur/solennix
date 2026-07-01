import XCTest
import SolennixCore
// WidgetModels + WidgetSharedConstants are compiled into this target (the
// extension product is not linkable by a test bundle).

/// REQ-WDS-02 (amended): automated in-process proxy for the cross-process
/// round-trip. The widget data layer writes to and reads from the App Group
/// `UserDefaults` suite within one process; the codesigned cross-process gate
/// is a manual step (PR2). Also covers REQ-WDS-10 (`.iso8601` decode).
final class WidgetDataRoundTripTests: XCTestCase {

    /// Mutating the shared App Group suite; clean every key we touch so tests
    /// stay isolated.
    private let suite = AppGroup.userDefaults

    private let allKeys = [
        WidgetDataKey.upcomingEvents,
        WidgetDataKey.kpis,
        WidgetDataKey.lastUpdated
    ]

    override func tearDown() {
        for key in allKeys { suite.removeObject(forKey: key) }
        super.tearDown()
    }

    // MARK: (a) Round-trip — events

    func testEventRoundTripPreservesAllFields() throws {
        let original = WidgetEvent(
            id: "evt_1",
            clientName: "Cliente Prueba",
            eventType: "Boda",
            eventDate: ISO8601DateFormatter().date(from: "2026-07-15T18:30:00Z")!,
            startTime: "18:30",
            location: "Salón Central",
            guestCount: 120,
            status: "confirmed",
            totalAmount: 45000
        )

        WidgetDataProvider.shared.saveUpcomingEvents([original])
        let decoded = WidgetDataProvider.shared.getUpcomingEvents()

        XCTAssertEqual(decoded.count, 1)
        let read = try XCTUnwrap(decoded.first)
        XCTAssertEqual(read.id, original.id)
        XCTAssertEqual(read.clientName, original.clientName)
        XCTAssertEqual(read.eventType, original.eventType)
        XCTAssertEqual(read.eventDate, original.eventDate)
        XCTAssertEqual(read.startTime, original.startTime)
        XCTAssertEqual(read.location, original.location)
        XCTAssertEqual(read.guestCount, original.guestCount)
        XCTAssertEqual(read.status, original.status)
        XCTAssertEqual(read.totalAmount, original.totalAmount)
    }

    func testEventsEmptyWhenNoData() {
        suite.removeObject(forKey: WidgetDataKey.upcomingEvents)
        XCTAssertTrue(WidgetDataProvider.shared.getUpcomingEvents().isEmpty)
    }

    // MARK: (a) Round-trip — KPIs

    func testKPIsRoundTripPreservesAllFields() {
        let original = WidgetKPIs(
            monthlyRevenue: 12500,
            eventsThisMonth: 7,
            eventsThisWeek: 3,
            lowStockCount: 2,
            pendingPayments: 3400,
            confirmedEvents: 5,
            quotedEvents: 2
        )

        WidgetDataProvider.shared.saveKPIs(original)
        let read = WidgetDataProvider.shared.getKPIs()

        XCTAssertEqual(read.monthlyRevenue, original.monthlyRevenue)
        XCTAssertEqual(read.eventsThisMonth, original.eventsThisMonth)
        XCTAssertEqual(read.eventsThisWeek, original.eventsThisWeek)
        XCTAssertEqual(read.lowStockCount, original.lowStockCount)
        XCTAssertEqual(read.pendingPayments, original.pendingPayments)
        XCTAssertEqual(read.confirmedEvents, original.confirmedEvents)
        XCTAssertEqual(read.quotedEvents, original.quotedEvents)
    }

    // MARK: (c) Model decode `.iso8601`

    /// Decoding a raw JSON payload with an ISO-8601 date via the same strategy
    /// `WidgetDataProvider` uses must yield the exact date (REQ-WDS-10).
    func testDecodingISO8601EventDate() throws {
        let json = """
        [{
            "id": "evt_2",
            "clientName": "X",
            "eventType": "Cumple",
            "eventDate": "2026-12-31T23:59:59Z",
            "startTime": null,
            "location": null,
            "guestCount": null,
            "status": "quoted",
            "totalAmount": null
        }]
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let events = try decoder.decode([WidgetEvent].self, from: json)

        let expected = ISO8601DateFormatter().date(from: "2026-12-31T23:59:59Z")!
        XCTAssertEqual(events.first?.eventDate, expected)
    }

    func testWidgetAuthStateCodableRoundTrip() throws {
        for state in [WidgetAuthState.authenticated, .signedOut] {
            let data = try JSONEncoder().encode(state)
            let decoded = try JSONDecoder().decode(WidgetAuthState.self, from: data)
            XCTAssertEqual(decoded, state)
        }
    }
}
