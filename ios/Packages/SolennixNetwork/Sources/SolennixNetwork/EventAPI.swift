import Foundation

// MARK: - EventAPI

/// A narrow protocol seam over the concrete `APIClient` actor, exposing only the
/// event CRUD endpoints that `EventRepository` consumes.
///
/// **ADR-9 — Repository test seam.** `APIClient` is a concrete `public actor`
/// (`APIClient.swift`); it cannot be subclassed or mocked. To make
/// `EventRepository` unit-testable (create/update/delete → sync fan-out,
/// idempotency, migration, partial-failure), this protocol exposes only the four
/// verbs the repository needs. The concrete `APIClient` already implements each
/// requirement verbatim, so conformance is `extension APIClient: EventAPI {}` with
/// **zero behavioral change**. Repository-layer tests use `MockEventAPI` (test
/// target); no `URLSession` or `EKEventStore` is touched.
///
/// **ADR-9 signature correction (REQUIRED).** The design draft typed these methods
/// `endpoint: Endpoint` / `body: AnyCodable`, but the REAL `APIClient` uses
/// `endpoint: String` / `body: some Encodable`. This protocol matches the real
/// signatures exactly so the conformance compiles honestly. The repository builds
/// request bodies as `AnyCodable` (an existing `Encodable` type in `SolennixCore`),
/// which satisfies the `some Encodable` parameter.
public protocol EventAPI: AnyObject, Sendable {

    /// `GET <endpoint>` with optional query params, decoding the JSON body as `T`.
    func get<T>(_ endpoint: String, params: [String: String]?) async throws -> T where T: Decodable

    /// `POST <endpoint>` with a JSON `body`, decoding the response as `T`.
    func post<T>(_ endpoint: String, body: some Encodable) async throws -> T where T: Decodable

    /// `PUT <endpoint>` with a JSON `body`, decoding the response as `T`.
    func put<T>(_ endpoint: String, body: some Encodable) async throws -> T where T: Decodable

    /// `DELETE <endpoint>`. No response body is decoded.
    func delete(_ endpoint: String) async throws
}

// MARK: - APIClient conformance (zero behavioral change)

/// The concrete `APIClient` actor already implements every `EventAPI` requirement
/// with matching signatures (`APIClient.get(_:params:)`, `.post(_:body:)`,
/// `.put(_:body:)`, `.delete(_:)`). This extension only declares the conformance;
/// it adds no methods and changes no behavior. The default value on
/// `get(_:params:)` (`= nil`) is an *additional* caller convenience and does not
/// affect satisfaction of the requirement declared without a default.
extension APIClient: EventAPI {}
