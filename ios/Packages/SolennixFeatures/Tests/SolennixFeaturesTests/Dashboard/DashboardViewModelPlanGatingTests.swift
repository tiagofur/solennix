import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// `DashboardViewModel.loadDashboard()` must route basic-plan users to
/// `GET /dashboard/kpis` (core counts only) and paid users to
/// `GET /dashboard/summary` (KPIs + the 5 premium datasets). Basic users
/// must never issue the summary fetch — it carries premium chart/widget
/// data they can't see (#820).
///
/// Reuses `MockURLProtocol` from `DashboardViewModelTests`. Each handler
/// stubs the body-list endpoints (`/events`, `/clients`, …) so
/// `loadDashboard` completes; the assertions focus on which header
/// endpoint was hit and whether the premium datasets were populated.
final class DashboardViewModelPlanGatingTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!

    override func setUp() async throws {
        try await super.setUp()

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        await apiClient.setAuthManager(AuthManager())
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - 1. Basic plan → /dashboard/kpis only, premium datasets empty

    @MainActor
    func testBasicPlan_FetchesKPIsOnly_SkipsSummary() async {
        let vm = DashboardViewModel(apiClient: apiClient, isBasicPlan: true)
        var hitSummary = false

        MockURLProtocol.requestHandler = { request in
            let urlString = request.url?.absoluteString ?? ""
            let ok = { (body: Data) in
                (HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                                 headerFields: ["Content-Type": "application/json"])!, body)
            }
            if urlString.contains("/dashboard/kpis") {
                let json = """
                {
                    "totalRevenue": 50000.0, "eventsThisMonth": 5, "pendingQuotes": 3,
                    "lowStockItems": 2, "upcomingEvents": 4, "totalClients": 10,
                    "totalProducts": 8, "averageEventValue": 10000.0,
                    "netSalesThisMonth": 25000.0, "cashCollectedThisMonth": 15000.0,
                    "vatCollectedThisMonth": 2400.0, "vatOutstandingThisMonth": 1600.0
                }
                """
                return ok(json.data(using: .utf8)!)
            }
            if urlString.contains("/dashboard/summary") {
                hitSummary = true
            }
            // Body lists — stubbed empty so loadDashboard finishes cleanly.
            return ok("[]".data(using: .utf8)!)
        }

        await vm.loadDashboard()

        // KPIs loaded (core data is plan-agnostic).
        XCTAssertEqual(vm.kpis?.totalClients, 10)
        XCTAssertEqual(vm.kpis?.totalProducts, 8)
        // Premium datasets never populated — the summary fetch never ran.
        XCTAssertFalse(hitSummary, "basic plan must NOT hit /dashboard/summary (#820)")
        XCTAssertTrue(vm.monthlyRevenueTrend.isEmpty)
        XCTAssertTrue(vm.topClients.isEmpty)
        XCTAssertTrue(vm.productDemand.isEmpty)
        XCTAssertTrue(vm.forecast.isEmpty)
        XCTAssertTrue(vm.eventStatusCounts.isEmpty)
    }

    // MARK: - 2. Paid plan → /dashboard/summary, premium datasets populated

    @MainActor
    func testPaidPlan_FetchesSummary_PopulatesPremiumDatasets() async {
        let vm = DashboardViewModel(apiClient: apiClient, isBasicPlan: false)

        MockURLProtocol.requestHandler = { request in
            let urlString = request.url?.absoluteString ?? ""
            let ok = { (body: Data) in
                (HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                                 headerFields: ["Content-Type": "application/json"])!, body)
            }
            if urlString.contains("/dashboard/summary") {
                let json = """
                {
                    "kpis": {
                        "totalRevenue": 50000.0, "eventsThisMonth": 5, "pendingQuotes": 3,
                        "lowStockItems": 2, "upcomingEvents": 4, "totalClients": 10,
                        "totalProducts": 8, "averageEventValue": 10000.0,
                        "netSalesThisMonth": 25000.0, "cashCollectedThisMonth": 15000.0,
                        "vatCollectedThisMonth": 2400.0, "vatOutstandingThisMonth": 1600.0
                    },
                    "revenueChart": [{"month": "2026-07", "revenue": 1500.0, "eventCount": 2}],
                    "eventsByStatus": [{"status": "confirmed", "count": 4}],
                    "topClients": [{"id": "00000000-0000-0000-0000-000000000001", "name": "Alice", "totalSpent": 20000.0, "totalEvents": 5}],
                    "productDemand": [{"id": "00000000-0000-0000-0000-000000000002", "name": "Pastel", "timesUsed": 15, "totalRevenue": 30000.0}],
                    "forecast": [{"month": "2026-08", "confirmedRevenue": 25000.0, "confirmedEvents": 3}]
                }
                """
                return ok(json.data(using: .utf8)!)
            }
            // Body lists — stubbed empty.
            return ok("[]".data(using: .utf8)!)
        }

        await vm.loadDashboard()

        // KPIs + premium datasets all populated.
        XCTAssertEqual(vm.kpis?.totalClients, 10)
        XCTAssertEqual(vm.topClients.count, 1)
        XCTAssertEqual(vm.productDemand.count, 1)
        XCTAssertEqual(vm.forecast.count, 1)
        XCTAssertEqual(vm.eventStatusCounts[.confirmed], 4)
        XCTAssertFalse(vm.monthlyRevenueTrend.isEmpty)
    }
}
