import XCTest
import Foundation
import SolennixCore

final class EventModelsTests: XCTestCase {

    func testEventInitWithRequiredFieldsOnlyKeepsOptionalsNil() {
        let event = Event(
            id: "ev_1",
            userId: "u_1",
            clientId: "cl_1",
            eventDate: "2026-10-10",
            serviceType: "Boda",
            numPeople: 120,
            status: .quoted,
            discount: 0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0,
            totalAmount: 12000,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        XCTAssertNil(event.startTime)
        XCTAssertNil(event.endTime)
        XCTAssertNil(event.location)
        XCTAssertNil(event.city)
        XCTAssertNil(event.depositPercent)
        XCTAssertNil(event.cancellationDays)
        XCTAssertNil(event.refundPercent)
        XCTAssertNil(event.notes)
        XCTAssertNil(event.photos)
        XCTAssertEqual(event.status, .quoted)
        XCTAssertEqual(event.discountType, .percent)
    }

    func testEventDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "ev_2",
          "user_id": "u_2",
          "client_id": "cl_2",
          "event_date": "2026-11-11",
          "start_time": "18:00",
          "end_time": "23:00",
          "service_type": "Corporativo",
          "num_people": 80,
          "status": "confirmed",
          "discount": 150,
          "discount_type": "fixed",
          "requires_invoice": true,
          "tax_rate": 0.16,
          "tax_amount": 400,
          "total_amount": 5400,
          "location": "Salon Centro",
          "city": "CDMX",
          "deposit_percent": 30,
          "cancellation_days": 10,
          "refund_percent": 50,
          "notes": "Vegetariano",
          "photos": "[]",
          "created_at": "2026-02-01T00:00:00Z",
          "updated_at": "2026-02-02T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let event = try decoder.decode(Event.self, from: json)

        XCTAssertEqual(event.id, "ev_2")
        XCTAssertEqual(event.status, .confirmed)
        XCTAssertEqual(event.discountType, .fixed)
        XCTAssertEqual(event.startTime, "18:00")
        XCTAssertEqual(event.city, "CDMX")
        XCTAssertEqual(event.depositPercent, 30)
        XCTAssertEqual(event.notes, "Vegetariano")
    }

    func testEventDecodeUsesEnumFallbacksForUnknownValues() throws {
        let json = """
        {
          "id": "ev_3",
          "user_id": "u_3",
          "client_id": "cl_3",
          "event_date": "2026-12-12",
          "service_type": "Quince",
          "num_people": 60,
          "status": "not_valid",
          "discount": 0,
          "discount_type": "not_valid",
          "requires_invoice": false,
          "tax_rate": 0.16,
          "tax_amount": 0,
          "total_amount": 3000,
          "created_at": "2026-02-01T00:00:00Z",
          "updated_at": "2026-02-02T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let event = try decoder.decode(Event.self, from: json)

        XCTAssertEqual(event.status, .quoted)
        XCTAssertEqual(event.discountType, .percent)
    }

    func testEventStatusAndDiscountTypeDecodeCaseInsensitive() throws {
        let status = try JSONDecoder().decode(EventStatus.self, from: Data("\"COMPLETED\"".utf8))
        let discount = try JSONDecoder().decode(DiscountType.self, from: Data("\"FIXED\"".utf8))

        XCTAssertEqual(status, .completed)
        XCTAssertEqual(discount, .fixed)
    }

    func testEventRoundtripSnakeCaseCoding() throws {
        let original = Event(
            id: "ev_4",
            userId: "u_4",
            clientId: "cl_4",
            eventDate: "2026-09-09",
            startTime: "17:00",
            endTime: "22:00",
            serviceType: "Bautizo",
            numPeople: 45,
            status: .cancelled,
            discount: 10,
            discountType: .percent,
            requiresInvoice: true,
            taxRate: 0.16,
            taxAmount: 160,
            totalAmount: 1160,
            location: "Jardin Sur",
            city: "Puebla",
            depositPercent: 20,
            cancellationDays: 7,
            refundPercent: 30,
            notes: "Con DJ",
            photos: "[]",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-03T00:00:00Z"
        )

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try decoder.decode(Event.self, from: data)

        XCTAssertEqual(decoded, original)
    }
}
