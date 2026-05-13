import XCTest
import Foundation
import SolennixCore

final class PaymentSubmissionUnavailableDateTests: XCTestCase {

    func testPaymentSubmissionDecodesSnakeCaseWithAllFields() throws {
        let json = """
        {
          "id": "ps_1",
          "event_id": "ev_1",
          "client_id": "cl_1",
          "user_id": "u_1",
          "amount": 2500.75,
          "transfer_ref": "SPEI-123",
          "receipt_file_url": "https://cdn.solennix.com/r/1.png",
          "status": "pending",
          "submitted_at": "2026-05-10T00:00:00Z",
          "reviewed_by": null,
          "reviewed_at": null,
          "rejection_reason": null,
          "linked_payment_id": null,
          "created_at": "2026-05-10T00:00:00Z",
          "updated_at": "2026-05-10T00:00:00Z",
          "client_name": "Ana",
          "event_label": "Boda Ana"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let submission = try decoder.decode(PaymentSubmission.self, from: json)

        XCTAssertEqual(submission.id, "ps_1")
        XCTAssertEqual(submission.eventId, "ev_1")
        XCTAssertEqual(submission.clientId, "cl_1")
        XCTAssertEqual(submission.userId, "u_1")
        XCTAssertEqual(submission.amount, 2500.75)
        XCTAssertEqual(submission.transferRef, "SPEI-123")
        XCTAssertEqual(submission.receiptFileUrl, "https://cdn.solennix.com/r/1.png")
        XCTAssertEqual(submission.status, .pending)
        XCTAssertEqual(submission.clientName, "Ana")
        XCTAssertEqual(submission.eventLabel, "Boda Ana")
        XCTAssertNil(submission.reviewedBy)
        XCTAssertNil(submission.linkedPaymentId)
    }

    func testPaymentSubmissionDecodesWithoutOptionalFields() throws {
        let json = """
        {
          "id": "ps_2",
          "event_id": "ev_2",
          "client_id": "cl_2",
          "user_id": "u_2",
          "amount": 999,
          "status": "approved",
          "submitted_at": "2026-05-11T00:00:00Z",
          "created_at": "2026-05-11T00:00:00Z",
          "updated_at": "2026-05-11T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let submission = try decoder.decode(PaymentSubmission.self, from: json)

        XCTAssertEqual(submission.status, .approved)
        XCTAssertNil(submission.transferRef)
        XCTAssertNil(submission.receiptFileUrl)
        XCTAssertNil(submission.reviewedAt)
        XCTAssertNil(submission.rejectionReason)
        XCTAssertNil(submission.clientName)
        XCTAssertNil(submission.eventLabel)
    }

    func testPaymentSubmissionStatusRejectsInvalidValue() {
        XCTAssertThrowsError(
            try JSONDecoder().decode(PaymentSubmissionStatus.self, from: Data("\"invalid\"".utf8))
        )
    }

    func testUnavailableDateInitWithReason() {
        let date = UnavailableDate(
            id: "ud_1",
            userId: "u_1",
            startDate: "2026-06-01",
            endDate: "2026-06-03",
            reason: "Evento privado"
        )

        XCTAssertEqual(date.id, "ud_1")
        XCTAssertEqual(date.userId, "u_1")
        XCTAssertEqual(date.startDate, "2026-06-01")
        XCTAssertEqual(date.endDate, "2026-06-03")
        XCTAssertEqual(date.reason, "Evento privado")
    }

    func testUnavailableDateInitWithoutReason() {
        let date = UnavailableDate(
            id: "ud_2",
            userId: "u_2",
            startDate: "2026-07-10",
            endDate: "2026-07-10"
        )

        XCTAssertNil(date.reason)
    }

    func testUnavailableDateRoundtripSnakeCaseCoding() throws {
        let original = UnavailableDate(
            id: "ud_3",
            userId: "u_3",
            startDate: "2026-08-15",
            endDate: "2026-08-20",
            reason: "Vacaciones"
        )

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try decoder.decode(UnavailableDate.self, from: data)

        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.userId, original.userId)
        XCTAssertEqual(decoded.startDate, original.startDate)
        XCTAssertEqual(decoded.endDate, original.endDate)
        XCTAssertEqual(decoded.reason, original.reason)
    }
}
