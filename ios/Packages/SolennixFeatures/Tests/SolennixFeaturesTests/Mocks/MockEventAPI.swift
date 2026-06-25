import Foundation
import SolennixCore
import SolennixNetwork

/// A recording test double for `EventAPI` (ADR-9).
///
/// `EventRepository` (Phase 2) is injected with an `any EventAPI`. In tests it
/// receives a `MockEventAPI` instead of the concrete `APIClient` actor, so
/// create/update/delete → sync fan-out is assertable with no `URLSession`.
///
/// Design:
/// - It is an `actor` (hence `@Sendable`) — the real `APIClient` is an actor, and
///   the mock mirrors that reference/serial-access nature.
/// - Every call appends a `RecordedCall` (verb + endpoint + body `Data`) BEFORE the
///   canned response/error is produced, so a call is recorded even when it throws.
/// - The canned response is stored as pre-encoded JSON `Data` and decoded to the
///   requested `T`, so the mock works generically for any `Decodable` return type
///   the repository requests (today: `Event`; later: `[Event]`).
public actor MockEventAPI: EventAPI {

    /// A single recorded `EventAPI` invocation, for assertion in repository tests.
    public struct RecordedCall: Sendable, Equatable {
        /// HTTP verb as recorded by the protocol method: GET / POST / PUT / DELETE.
        public let verb: String
        /// The endpoint string passed to the call (e.g. `/events`, `/events/123`).
        public let endpoint: String
        /// The encoded request body for POST/PUT, or `nil` for GET/DELETE.
        public let bodyData: Data?
    }

    /// Every call made through this double, in call order.
    public private(set) var recordedCalls: [RecordedCall] = []

    /// Pre-encoded JSON returned (and decoded) for every get/post/put call.
    private var cannedResponseData: Data

    /// When non-nil, every call throws this instead of returning. The call is still
    /// recorded, mirroring how a real failing request would still have been issued.
    public var errorToThrow: (any Error)?

    /// Creates a double that returns `cannedEvent` for any `get`/`post`/`put`.
    public init(cannedEvent: Event) {
        // Encoding can only fail for invalid JSON; a Codable Event cannot, so this
        // fallback to empty data is purely defensive.
        self.cannedResponseData = (try? JSONEncoder().encode(cannedEvent)) ?? Data()
    }

    /// Sets the canned response directly as pre-encoded JSON `Data`. Use this to
    /// return non-`Event` payloads (e.g. an `[Event]` for `list()`).
    public func setCannedResponse(_ data: Data) {
        cannedResponseData = data
    }

    /// Injects an error to throw on every subsequent call (cleared with `nil`).
    public func setError(_ error: (any Error)?) {
        errorToThrow = error
    }

    // MARK: - EventAPI

    public func get<T>(_ endpoint: String, params: [String: String]?) async throws -> T where T: Decodable {
        recordedCalls.append(RecordedCall(verb: "GET", endpoint: endpoint, bodyData: nil))
        if let errorToThrow { throw errorToThrow }
        return try JSONDecoder().decode(T.self, from: cannedResponseData)
    }

    public func post<T>(_ endpoint: String, body: some Encodable) async throws -> T where T: Decodable {
        let bodyData = try JSONEncoder().encode(body)
        recordedCalls.append(RecordedCall(verb: "POST", endpoint: endpoint, bodyData: bodyData))
        if let errorToThrow { throw errorToThrow }
        return try JSONDecoder().decode(T.self, from: cannedResponseData)
    }

    public func put<T>(_ endpoint: String, body: some Encodable) async throws -> T where T: Decodable {
        let bodyData = try JSONEncoder().encode(body)
        recordedCalls.append(RecordedCall(verb: "PUT", endpoint: endpoint, bodyData: bodyData))
        if let errorToThrow { throw errorToThrow }
        return try JSONDecoder().decode(T.self, from: cannedResponseData)
    }

    public func delete(_ endpoint: String) async throws {
        recordedCalls.append(RecordedCall(verb: "DELETE", endpoint: endpoint, bodyData: nil))
        if let errorToThrow { throw errorToThrow }
    }
}
