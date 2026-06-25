import XCTest
@testable import SolennixFeatures
import SolennixCore
import SolennixNetwork

/// Behavioral tests for `MockEventAPI` — the `EventAPI` test double (ADR-9).
///
/// `MockEventAPI` is the recording double `EventRepository` (Phase 2) is injected
/// with so its CRUD→sync fan-out is unit-testable without a `URLSession`. These
/// tests assert the mock records every endpoint + body call and returns the canned
/// `Event` verbatim — exactly what later repository tests rely on.
final class MockEventAPITests: XCTestCase {

    // MARK: - Helpers

    /// Builds a minimal but valid `Event` for assertions.
    private func makeEvent(id: String = "evt-1") -> Event {
        Event(
            id: id,
            userId: "user-1",
            clientId: "client-1",
            eventDate: "2026-07-01",
            startTime: "10:00",
            endTime: "12:00",
            serviceType: "Boda",
            numPeople: 100,
            status: .confirmed,
            discount: 0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0,
            taxAmount: 0,
            totalAmount: 1500,
            createdAt: "2026-06-24T00:00:00Z",
            updatedAt: "2026-06-24T00:00:00Z"
        )
    }

    // MARK: - post

    func testPostRecordsEndpointAndBodyAndReturnsCannedEvent() async throws {
        let canned = makeEvent(id: "evt-9")
        // Assign to the existential to prove the double works through `any EventAPI`,
        // but assert recording through the concrete type where `recordedCalls` lives.
        let asAPI: any EventAPI = MockEventAPI(cannedEvent: canned)
        let mock = asAPI as! MockEventAPI

        let body = AnyCodable([
            "service_type": "Boda",
            "num_people": 100
        ] as [String: Any?])
        let returned: Event = try await asAPI.post(Endpoint.events, body: body)

        XCTAssertEqual(returned, canned, "post must return the canned Event verbatim")

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls.first?.verb, "POST")
        XCTAssertEqual(calls.first?.endpoint, Endpoint.events)

        // The recorded body must round-trip back to the encoded payload — proving
        // the repository can later assert on what was sent.
        let recordedBody = try XCTUnwrap(calls.first?.bodyData)
        let decoded = try JSONDecoder().decode([String: AnyCodable].self, from: recordedBody)
        XCTAssertEqual(decoded["service_type"]?.value, .string("Boda"))
        XCTAssertEqual(decoded["num_people"]?.value, .int(100))
    }

    // MARK: - put

    func testPutRecordsEndpointAndBody() async throws {
        let mock = MockEventAPI(cannedEvent: makeEvent())
        let body = AnyCodable(["status": "cancelled"] as [String: Any?])

        let _: Event = try await mock.put(Endpoint.event("evt-1"), body: body)

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls.first?.verb, "PUT")
        XCTAssertEqual(calls.first?.endpoint, Endpoint.event("evt-1"))
    }

    // MARK: - get

    func testGetRecordsEndpointWithoutBody() async throws {
        let mock = MockEventAPI(cannedEvent: makeEvent(id: "evt-7"))

        let returned: Event = try await mock.get(Endpoint.event("evt-7"), params: nil)

        XCTAssertEqual(returned.id, "evt-7")
        let calls = await mock.recordedCalls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls.first?.verb, "GET")
        XCTAssertEqual(calls.first?.endpoint, Endpoint.event("evt-7"))
        XCTAssertNil(calls.first?.bodyData, "GET must not record a body")
    }

    // MARK: - delete

    func testDeleteRecordsEndpointWithoutBody() async throws {
        let mock = MockEventAPI(cannedEvent: makeEvent())

        try await mock.delete(Endpoint.event("evt-1"))

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls.first?.verb, "DELETE")
        XCTAssertEqual(calls.first?.endpoint, Endpoint.event("evt-1"))
        XCTAssertNil(calls.first?.bodyData)
    }

    // MARK: - multi-call recording (triangulation)

    func testMultipleCallsAreRecordedInOrder() async throws {
        let mock = MockEventAPI(cannedEvent: makeEvent())
        let body = AnyCodable(["x": 1] as [String: Any?])

        let _: Event = try await mock.get(Endpoint.events, params: ["limit": "10"])
        let _: Event = try await mock.post(Endpoint.events, body: body)
        let _: Event = try await mock.put(Endpoint.event("a"), body: body)
        try await mock.delete(Endpoint.event("a"))

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls.map(\.verb), ["GET", "POST", "PUT", "DELETE"])
        XCTAssertEqual(calls.map(\.endpoint), [
            Endpoint.events,
            Endpoint.events,
            Endpoint.event("a"),
            Endpoint.event("a")
        ])
    }

    // MARK: - error injection

    func testInjectedErrorIsThrownAndCallStillRecorded() async throws {
        struct Boom: Error, Equatable {}
        let mock = MockEventAPI(cannedEvent: makeEvent())
        await mock.setError(Boom())

        do {
            let _: Event = try await mock.post(Endpoint.events, body: AnyCodable(["a": 1] as [String: Any?]))
            XCTFail("Expected injected error to be thrown")
        } catch is Boom {
            // expected
        } catch {
            XCTFail("Expected Boom, got \(error)")
        }

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls.count, 1, "Call must be recorded even when it throws")
    }
}
