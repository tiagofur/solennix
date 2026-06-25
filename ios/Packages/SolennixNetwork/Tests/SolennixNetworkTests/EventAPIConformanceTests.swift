import XCTest
@testable import SolennixNetwork

/// Conformance proof for the narrow `EventAPI` protocol seam (ADR-9).
///
/// `APIClient` is a concrete `public actor` that cannot be subclassed or mocked.
/// Phase 1.2 introduces a *narrow* `protocol EventAPI` (event get/post/put/delete
/// only) so that `EventRepository` (Phase 2) can be unit-tested with a test double.
///
/// The requirement signatures mirror the REAL `APIClient` methods
/// (`endpoint: String`, `body: some Encodable`) — NOT the `Endpoint`/`AnyCodable`
/// shape the original design draft assumed — so `extension APIClient: EventAPI {}`
/// is a zero-behavior-change conformance: the compiler guarantees every requirement
/// (get/post/put/delete) is already implemented by `APIClient`, otherwise the
/// extension would not compile. That compile-time guarantee IS the test for the
/// protocol's exact shape; this file proves the existential seam is real at runtime.
final class EventAPIConformanceTests: XCTestCase {

    /// The concrete `APIClient` actor must be usable as `any EventAPI` so it can be
    /// injected wherever the repository expects the seam, with no behavioral change.
    func testAPIClientConformsToEventAPI() async {
        let api: any EventAPI = APIClient()
        XCTAssertEqual(String(describing: type(of: api)), String(describing: APIClient.self))
    }

    /// A second, independently-constructed instance also satisfies the seam —
    /// proving the conformance is not tied to a single shared instance.
    func testFreshAPIClientAlsoConformsToEventAPI() async {
        let api: any EventAPI = APIClient(
            baseURL: URL(string: "https://example.invalid/api")!
        )
        XCTAssertEqual(String(describing: type(of: api)), String(describing: APIClient.self))
    }
}
