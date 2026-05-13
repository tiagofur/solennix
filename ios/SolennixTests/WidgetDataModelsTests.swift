import XCTest
@testable import Solennix
import SolennixCore

final class WidgetDataModelsTests: XCTestCase {

    func testWidgetEventDataFromMapsCoreFields() {
        let event = makeEvent(eventDate: "2026-05-20", status: .confirmed)

        let widget = WidgetEventData.from(event: event, clientName: "Ana Lopez")

        XCTAssertEqual(widget.id, "evt-1")
        XCTAssertEqual(widget.clientName, "Ana Lopez")
        XCTAssertEqual(widget.eventType, "Boda")
        XCTAssertEqual(widget.startTime, "18:30:00")
        XCTAssertEqual(widget.location, "Salon Central")
        XCTAssertEqual(widget.guestCount, 120)
        XCTAssertEqual(widget.status, EventStatus.confirmed.rawValue)
        XCTAssertEqual(widget.totalAmount, 15000)
    }

    func testWidgetEventDataFromParsesISOFullDate() {
        let event = makeEvent(eventDate: "2026-05-20", status: .quoted)

        let widget = WidgetEventData.from(event: event, clientName: "Cliente")

        var utcCalendar = Calendar(identifier: .gregorian)
        utcCalendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let components = utcCalendar.dateComponents([.year, .month, .day], from: widget.eventDate)
        XCTAssertEqual(components.year, 2026)
        XCTAssertEqual(components.month, 5)
        XCTAssertEqual(components.day, 20)
    }

    func testWidgetEventDataFromFallsBackToCurrentDateForInvalidInput() {
        let event = makeEvent(eventDate: "not-a-date", status: .quoted)
        let before = Date().addingTimeInterval(-2)

        let widget = WidgetEventData.from(event: event, clientName: "Cliente")

        let after = Date().addingTimeInterval(2)
        XCTAssertTrue(widget.eventDate >= before && widget.eventDate <= after)
    }

    func testWidgetKPIDataFromMapsAllValues() {
        let kpis = WidgetKPIData.from(
            monthlyRevenue: 10000,
            eventsThisMonth: 8,
            eventsThisWeek: 3,
            lowStockCount: 2,
            pendingPayments: 1500,
            confirmedEvents: 5,
            quotedEvents: 4
        )

        XCTAssertEqual(kpis.monthlyRevenue, 10000)
        XCTAssertEqual(kpis.eventsThisMonth, 8)
        XCTAssertEqual(kpis.eventsThisWeek, 3)
        XCTAssertEqual(kpis.lowStockCount, 2)
        XCTAssertEqual(kpis.pendingPayments, 1500)
        XCTAssertEqual(kpis.confirmedEvents, 5)
        XCTAssertEqual(kpis.quotedEvents, 4)
    }

    private func makeEvent(eventDate: String, status: EventStatus) -> Event {
        Event(
            id: "evt-1",
            userId: "usr-1",
            clientId: "cli-1",
            eventDate: eventDate,
            startTime: "18:30:00",
            endTime: nil,
            serviceType: "Boda",
            numPeople: 120,
            status: status,
            discount: 0,
            discountType: .fixed,
            requiresInvoice: false,
            taxRate: 16,
            taxAmount: 0,
            totalAmount: 15000,
            location: "Salon Central",
            city: "CDMX",
            depositPercent: nil,
            cancellationDays: nil,
            refundPercent: nil,
            notes: nil,
            photos: nil,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
    }
}
