import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// `EventFormViewModel.fetchProductCosts()` must leave `productUnitCosts[id]`
/// `nil` when the ingredient fetch fails — recording 0 would silently inflate
/// the profit margin and hide the `hasPendingProductCosts` warning (#809).
///
/// Strategy: a real `APIClient` whose `URLSession` is intercepted by
/// `ProfitabilityMockURLProtocol` (same seam used by `ClientFormViewModelTests`).
final class EventFormViewModelProfitabilityTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var viewModel: EventFormViewModel!

    override func setUp() async throws {
        try await super.setUp()

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [ProfitabilityMockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        viewModel = await EventFormViewModel(apiClient: apiClient)
    }

    override func tearDown() async throws {
        ProfitabilityMockURLProtocol.requestHandler = nil
        viewModel = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - 1. Regression #809: error leaves cost nil, warning visible

    /// A network failure must NOT record `0` — that would inflate the margin.
    /// The cost stays `nil` so `hasPendingProductCosts` remains `true` and the
    /// UI surfaces the "costs still loading" warning.
    @MainActor
    func testFetchProductCosts_OnError_LeavesCostNilAndWarningVisible() async {
        viewModel.selectedProducts = [
            SelectedProduct(productId: "p-error", unitPrice: 100)
        ]
        XCTAssertTrue(viewModel.productUnitCosts["p-error"] == nil, "cache starts empty for this product")
        XCTAssertTrue(viewModel.hasPendingProductCosts, "warning visible before any fetch")

        ProfitabilityMockURLProtocol.requestHandler = { _ in
            throw ProfitabilityMockError.network
        }

        await viewModel.fetchProductCosts()

        XCTAssertNil(viewModel.productUnitCosts["p-error"], "failed fetch must leave cost nil, not 0 (#809)")
        XCTAssertTrue(viewModel.hasPendingProductCosts, "warning stays visible when costs are unavailable")
    }

    // MARK: - 2. Success computes and caches ingredient cost

    /// A successful fetch sums `quantityRequired × unitCost` over ingredients of
    /// type `.ingredient` or `.supply`, caches it, and clears the warning.
    @MainActor
    func testFetchProductCosts_OnSuccess_ComputesAndCaches() async throws {
        viewModel.selectedProducts = [
            SelectedProduct(productId: "p-ok", unitPrice: 100)
        ]

        ProfitabilityMockURLProtocol.requestHandler = { _ in
            // 10*2 (ingredient) + 5*4 (supply) = 40 — equipment type excluded.
            let json = """
            [
                {"id":"i1","productId":"p-ok","inventoryId":"inv-1","quantityRequired":2,"createdAt":"2026-01-01T00:00:00Z","unitCost":10,"type":"ingredient"},
                {"id":"i2","productId":"p-ok","inventoryId":"inv-2","quantityRequired":4,"createdAt":"2026-01-01T00:00:00Z","unitCost":5,"type":"supply"},
                {"id":"i3","productId":"p-ok","inventoryId":"inv-3","quantityRequired":1,"createdAt":"2026-01-01T00:00:00Z","unitCost":99,"type":"equipment"}
            ]
            """
            let data = Data(json.utf8)
            let response = HTTPURLResponse(
                url: URL(string: "https://api.solennix.com/api/products/p-ok/ingredients")!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, data)
        }

        await viewModel.fetchProductCosts()

        // 10*2 (ingredient) + 5*4 (supply) = 40 — equipment type excluded.
        let cost = try XCTUnwrap(viewModel.productUnitCosts["p-ok"])
        XCTAssertEqual(cost, 40, accuracy: 0.001)
        XCTAssertFalse(viewModel.hasPendingProductCosts, "warning clears once costs are available")
    }

    // MARK: - 3. Skip already-cached products (no-op)

    /// Products already in the cache are not re-fetched — guards the fan-out
    /// from unnecessary work and from overwriting a previously-loaded cost.
    @MainActor
    func testFetchProductCosts_SkipsAlreadyCachedProducts() async {
        viewModel.selectedProducts = [
            SelectedProduct(productId: "p-cached", unitPrice: 100)
        ]
        viewModel.productUnitCosts["p-cached"] = 42.0

        ProfitabilityMockURLProtocol.requestHandler = { _ in
            // If reached, the cached value would be overwritten — fail loudly.
            XCTFail("should not re-fetch an already-cached product")
            throw ProfitabilityMockError.unexpectedCall
        }

        await viewModel.fetchProductCosts()

        XCTAssertEqual(viewModel.productUnitCosts["p-cached"], 42.0, "cached cost must be preserved")
    }
}

// MARK: - Mock URL Protocol

enum ProfitabilityMockError: Error {
    case network
    case unexpectedCall
}

final class ProfitabilityMockURLProtocol: URLProtocol {
    nonisolated(unsafe) static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = ProfitabilityMockURLProtocol.requestHandler else {
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
