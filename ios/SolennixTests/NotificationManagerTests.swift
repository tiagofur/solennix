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

    func testResolveEventDateReturnsNilForInvalidDateFormat() {
        let event = makeEvent(eventDate: "2026/05/10", startTime: "18:45:00")

        XCTAssertNil(NotificationManager.resolveEventDate(for: event))
    }

    func testReminderTypeTitlesAndOffsetsAreStable() {
        XCTAssertEqual(ReminderType.oneDay.title, "Evento manana")
        XCTAssertEqual(ReminderType.oneHour.title, "Evento en 1 hora")
        XCTAssertEqual(ReminderType.thirtyMinutes.title, "Evento en 30 minutos")

        XCTAssertEqual(ReminderType.oneDay.offset.day, -1)
        XCTAssertEqual(ReminderType.oneHour.offset.hour, -1)
        XCTAssertEqual(ReminderType.thirtyMinutes.offset.minute, -30)
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

    @MainActor
    func testRouteFromNotificationFallsBackToEventDetailWhenTypeMissing() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["event_id": "evt_999"],
            actionIdentifier: UNNotificationDefaultActionIdentifier
        )

        XCTAssertEqual(route, .eventDetail(id: "evt_999"))
    }

    @MainActor
    func testRouteFromNotificationReturnsEventListWhenPaymentHasNoEventId() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["type": "payment_received"],
            actionIdentifier: UNNotificationDefaultActionIdentifier
        )

        XCTAssertEqual(route, .eventList)
    }

    @MainActor
    func testRouteFromNotificationViewInventoryActionAlwaysRoutesToInventoryList() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: [:],
            actionIdentifier: NotificationAction.viewInventory.rawValue
        )

        XCTAssertEqual(route, .inventoryList)
    }

    @MainActor
    func testRouteFromNotificationForEventConfirmedUsesEventDetail() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["type": "event_confirmed", "event_id": "evt_777"],
            actionIdentifier: UNNotificationDefaultActionIdentifier
        )

        XCTAssertEqual(route, .eventDetail(id: "evt_777"))
    }

    @MainActor
    func testRouteFromNotificationForEventCancelledWithoutIdFallsBackToEventList() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["type": "event_cancelled"],
            actionIdentifier: UNNotificationDefaultActionIdentifier
        )

        XCTAssertEqual(route, .eventList)
    }

    @MainActor
    func testRouteFromNotificationUnknownTypeAndNoEventReturnsNil() {
        let route = NotificationManager.shared.routeFromNotification(
            userInfo: ["type": "unexpected_type"],
            actionIdentifier: UNNotificationDefaultActionIdentifier
        )

        XCTAssertNil(route)
    }

    func testPushNotificationPayloadDecodesSnakeCaseKeys() throws {
        let json = """
        {
          "type": "payment_received",
          "title": "Pago recibido",
          "body": "Cliente - $1000",
          "event_id": "evt_1",
          "payment_id": "pay_1",
          "inventory_item_id": "inv_1",
          "badge": 2
        }
        """.data(using: .utf8)!

        let payload = try JSONDecoder().decode(PushNotificationPayload.self, from: json)

        XCTAssertEqual(payload.type, .paymentReceived)
        XCTAssertEqual(payload.eventId, "evt_1")
        XCTAssertEqual(payload.paymentId, "pay_1")
        XCTAssertEqual(payload.inventoryItemId, "inv_1")
        XCTAssertEqual(payload.badge, 2)
    }

    func testPushNotificationPayloadEncodesSnakeCaseKeys() throws {
        let payload = PushNotificationPayload(
            type: .eventReminder,
            title: "Recordatorio",
            body: "Evento",
            eventId: "evt_2",
            paymentId: "pay_2",
            inventoryItemId: "inv_2",
            badge: 3
        )

        let data = try JSONEncoder().encode(payload)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(object?["event_id"] as? String, "evt_2")
        XCTAssertEqual(object?["payment_id"] as? String, "pay_2")
        XCTAssertEqual(object?["inventory_item_id"] as? String, "inv_2")
        XCTAssertEqual(object?["badge"] as? Int, 3)
        XCTAssertEqual(object?["type"] as? String, "event_reminder")
    }

    func testRegisterDeviceTokenStoresExpectedHexString() {
        NotificationManager.shared.deviceToken = nil
        let tokenData = Data([0x0A, 0xFF, 0x01, 0xB0])

        NotificationManager.shared.registerDeviceToken(tokenData)

        XCTAssertEqual(NotificationManager.shared.deviceToken, "0aff01b0")
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
