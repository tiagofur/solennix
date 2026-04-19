import XCTest
import UserNotifications
@testable import Solennix
import SolennixCore

@MainActor
final class NotificationManagerTests: XCTestCase {

    func testExtractEventIdFromReminderIdentifier() {
        XCTAssertEqual(NotificationManager.extractEventId(fromIdentifier: "evt_123_one_day"), "evt_123")
        XCTAssertEqual(NotificationManager.extractEventId(fromIdentifier: "evt_123_one_hour"), "evt_123")
        XCTAssertEqual(NotificationManager.extractEventId(fromIdentifier: "evt_123_thirty_minutes"), "evt_123")
        XCTAssertNil(NotificationManager.extractEventId(fromIdentifier: "random_identifier"))
    }

    func testResolveEventDateUsesStartTimeWhenPresent() {
        let event = makeEvent(eventDate: "2026-05-10", startTime: "18:45:00")

        let resolved = NotificationManager.resolveEventDate(for: event)

        XCTAssertNotNil(resolved)
        let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: resolved!)
        XCTAssertEqual(comps.year, 2026)
        XCTAssertEqual(comps.month, 5)
        XCTAssertEqual(comps.day, 10)
        XCTAssertEqual(comps.hour, 18)
        XCTAssertEqual(comps.minute, 45)
    }

    func testResolveEventDateFallsBackToNineAm() {
        let event = makeEvent(eventDate: "2026-05-10", startTime: nil)

        let resolved = NotificationManager.resolveEventDate(for: event)

        XCTAssertNotNil(resolved)
        let comps = Calendar.current.dateComponents([.hour, .minute], from: resolved!)
        XCTAssertEqual(comps.hour, 9)
        XCTAssertEqual(comps.minute, 0)
    }

    @MainActor
    func testRouteFromNotificationForEventReminder() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["type": "event_reminder", "event_id": "evt_100"],
            actionIdentifier: UNNotificationDefaultActionIdentifier
        )

        XCTAssertEqual(route, .eventDetail(id: "evt_100"))
    }

    @MainActor
    func testRouteFromNotificationForViewPaymentAction() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["type": "payment_received", "event_id": "evt_200"],
            actionIdentifier: NotificationAction.viewPayment.rawValue
        )

        XCTAssertEqual(route, .eventPayments(id: "evt_200"))
    }

    @MainActor
    func testRouteFromNotificationForLowStock() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["type": "low_stock"],
            actionIdentifier: UNNotificationDefaultActionIdentifier
        )

        XCTAssertEqual(route, .inventoryList)
    }

    private func makeEvent(eventDate: String, startTime: String?) -> Event {
        Event(
            id: "evt-test",
            userId: "usr-test",
            clientId: "cli-test",
            eventDate: eventDate,
            startTime: startTime,
            endTime: nil,
            serviceType: "Boda",
            numPeople: 120,
            status: .confirmed,
            discount: 0,
            discountType: .fixed,
            requiresInvoice: false,
            taxRate: 16,
            taxAmount: 1600,
            totalAmount: 10000,
            location: nil,
            city: nil,
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
